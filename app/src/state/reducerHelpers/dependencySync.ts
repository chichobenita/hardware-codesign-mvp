import {
  dependencyLink,
  mergeDependencyLinks,
  syncDependencyDisplayEntries
} from '../../../../shared/src';
import type { Connection, DesignState } from '../../types';

export function syncAllDependencyDisplayEntries(state: DesignState): DesignState {
  const nextPackages: DesignState['packageContentByModuleId'] = {};

  for (const moduleNode of state.moduleList) {
    const modulePackage = state.packageContentByModuleId[moduleNode.id];
    if (!modulePackage) {
      continue;
    }

    nextPackages[moduleNode.id] = syncDependencyDisplayEntries(modulePackage, state.packageContentByModuleId);
  }

  return {
    ...state,
    packageContentByModuleId: {
      ...state.packageContentByModuleId,
      ...nextPackages
    }
  };
}

export function withConnectionDependencies(current: DesignState, connection: Connection, timestamp: string): DesignState {
  const sourcePackage = current.packageContentByModuleId[connection.fromModuleId];
  const targetPackage = current.packageContentByModuleId[connection.toModuleId];

  if (!sourcePackage || !targetPackage) {
    return current;
  }

  const nextSourceLinks = mergeDependencyLinks(
    sourcePackage.dependencies?.links ?? [],
    dependencyLink('downstream', connection.toModuleId, connection.signal)
  );
  const nextTargetLinks = mergeDependencyLinks(
    targetPackage.dependencies?.links ?? [],
    dependencyLink('upstream', connection.fromModuleId, connection.signal)
  );

  const withUpdatedPackages: DesignState = {
    ...current,
    packageContentByModuleId: {
      ...current.packageContentByModuleId,
      [connection.fromModuleId]: {
        ...sourcePackage,
        lastUpdatedAt: timestamp,
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...sourcePackage.dependencies,
          links: nextSourceLinks
        }
      },
      [connection.toModuleId]: {
        ...targetPackage,
        lastUpdatedAt: timestamp,
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...targetPackage.dependencies,
          links: nextTargetLinks
        }
      }
    }
  };

  return {
    ...withUpdatedPackages,
    packageContentByModuleId: {
      ...withUpdatedPackages.packageContentByModuleId,
      [connection.fromModuleId]: syncDependencyDisplayEntries(
        withUpdatedPackages.packageContentByModuleId[connection.fromModuleId],
        withUpdatedPackages.packageContentByModuleId
      ),
      [connection.toModuleId]: syncDependencyDisplayEntries(
        withUpdatedPackages.packageContentByModuleId[connection.toModuleId],
        withUpdatedPackages.packageContentByModuleId
      )
    }
  };
}
