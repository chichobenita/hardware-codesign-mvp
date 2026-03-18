import {
  dependencyLink,
  mergeDependencyLinks,
  syncDependencyDisplayEntries,
  type ModulePackage
} from '../../../../shared/src';
import type { Connection } from '../../types';

export function normalizeDependencies(
  packageContentByModuleId: Record<string, ModulePackage>,
  connections: Connection[]
): Record<string, ModulePackage> {
  const nextPackages = { ...packageContentByModuleId };

  for (const connection of connections) {
    const sourcePackage = nextPackages[connection.fromModuleId];
    const targetPackage = nextPackages[connection.toModuleId];

    if (!sourcePackage || !targetPackage) {
      continue;
    }

    nextPackages[connection.fromModuleId] = {
      ...sourcePackage,
      dependencies: {
        ...sourcePackage.dependencies,
        links: mergeDependencyLinks(
          sourcePackage.dependencies?.links ?? [],
          dependencyLink('downstream', connection.toModuleId, connection.signal)
        )
      }
    };

    nextPackages[connection.toModuleId] = {
      ...targetPackage,
      dependencies: {
        ...targetPackage.dependencies,
        links: mergeDependencyLinks(
          targetPackage.dependencies?.links ?? [],
          dependencyLink('upstream', connection.fromModuleId, connection.signal)
        )
      }
    };
  }

  for (const moduleId of Object.keys(nextPackages)) {
    nextPackages[moduleId] = syncDependencyDisplayEntries(nextPackages[moduleId], nextPackages);
  }

  return nextPackages;
}
