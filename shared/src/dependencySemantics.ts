import type { ModuleDependencyLink, ModulePackage } from './types';
import type { SemanticConnection } from './semanticValidation';
import { getAuthoritativeModuleName } from './moduleIdentity';

function cleanSignal(signal?: string): string | undefined {
  const value = signal?.trim() ?? '';
  return value.length > 0 ? value : undefined;
}

export function dependencyLink(direction: ModuleDependencyLink['direction'], moduleId: string, signal?: string): ModuleDependencyLink {
  return {
    direction,
    moduleId,
    signal: cleanSignal(signal)
  };
}

export function dependencyLinkKey(link: ModuleDependencyLink): string {
  return `${link.direction}:${link.moduleId.trim().toLowerCase()}:${(cleanSignal(link.signal) ?? '').toLowerCase()}`;
}

export function mergeDependencyLinks(existing: ModuleDependencyLink[], next: ModuleDependencyLink): ModuleDependencyLink[] {
  const nextKey = dependencyLinkKey(next);
  return existing.some((item) => dependencyLinkKey(item) === nextKey) ? existing : [...existing, next];
}

export function formatDependencyLink(link: ModuleDependencyLink, packageContentByModuleId: Record<string, ModulePackage>): string {
  const moduleName = getAuthoritativeModuleName(link.moduleId, packageContentByModuleId[link.moduleId], link.moduleId);
  return link.signal ? `${link.direction}:${moduleName}:${link.signal}` : `${link.direction}:${moduleName}`;
}

export function splitDependencyNotes(relevantDependencies: string[]): { managedEntries: string[]; customEntries: string[] } {
  const managedEntries: string[] = [];
  const customEntries: string[] = [];

  for (const entry of relevantDependencies) {
    const clean = entry.trim();
    if (!clean) {
      continue;
    }

    if (clean.startsWith('upstream:') || clean.startsWith('downstream:')) {
      managedEntries.push(clean);
    } else {
      customEntries.push(clean);
    }
  }

  return { managedEntries, customEntries };
}

export function syncDependencyDisplayEntries(modulePackage: ModulePackage, packageContentByModuleId: Record<string, ModulePackage>): ModulePackage {
  const links = modulePackage.dependencies?.links ?? [];
  const existingText = modulePackage.dependencies?.relevantDependencies ?? [];
  const { customEntries } = splitDependencyNotes(existingText);

  const managedEntries = links.map((linkItem) => formatDependencyLink(linkItem, packageContentByModuleId));
  const relevantDependencies = Array.from(new Set([...customEntries, ...managedEntries]));

  return {
    ...modulePackage,
    dependencies: {
      ...modulePackage.dependencies,
      links,
      relevantDependencies
    }
  };
}

export function expectedDependencyLinks(connections: SemanticConnection[]): Record<string, { upstream: Set<string>; downstream: Set<string> }> {
  const expected: Record<string, { upstream: Set<string>; downstream: Set<string> }> = {};

  for (const connection of connections) {
    const signal = cleanSignal(connection.signal);
    const downstream = dependencyLink('downstream', connection.toModuleId, signal);
    const upstream = dependencyLink('upstream', connection.fromModuleId, signal);

    expected[connection.fromModuleId] ??= { upstream: new Set<string>(), downstream: new Set<string>() };
    expected[connection.toModuleId] ??= { upstream: new Set<string>(), downstream: new Set<string>() };

    expected[connection.fromModuleId].downstream.add(dependencyLinkKey(downstream));
    expected[connection.toModuleId].upstream.add(dependencyLinkKey(upstream));
  }

  return expected;
}
