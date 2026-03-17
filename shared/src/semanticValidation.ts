import { dependencyLinkKey, expectedDependencyLinks, splitDependencyNotes } from './dependencySemantics';
import type { ModuleDependencyLink, ModulePackage } from './types';

export type ValidationSeverity = 'error' | 'warning';

export type SemanticValidationCode =
  | 'duplicate_port_name'
  | 'self_connection'
  | 'connection_missing_module'
  | 'leaf_missing_purpose'
  | 'leaf_missing_ports'
  | 'missing_dependency_for_connection'
  | 'stale_dependency_entry';

export type SemanticValidationIssue = {
  code: SemanticValidationCode;
  message: string;
  severity: ValidationSeverity;
  moduleId?: string;
};

export type SemanticConnection = {
  fromModuleId: string;
  toModuleId: string;
  signal: string;
};

export type SemanticDesignSnapshot = {
  moduleIds: string[];
  packageContentByModuleId: Record<string, ModulePackage>;
  connections: SemanticConnection[];
};

function cleanKey(value: string): string {
  return value.trim().toLowerCase();
}

function hasPurpose(modulePackage: ModulePackage): boolean {
  return Boolean(modulePackage.purpose?.summary?.trim().length);
}

function hasPorts(modulePackage: ModulePackage): boolean {
  return (modulePackage.interfaces?.ports ?? []).some((port) => port.name.trim().length > 0);
}

function requiresLeafCompleteness(modulePackage: ModulePackage): boolean {
  const isApprovedLeaf = modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
  const isLeafReady = modulePackage.packageStatus === 'leaf_ready' || modulePackage.packageStatus === 'handed_off';
  return isApprovedLeaf || isLeafReady;
}

function parseLegacyDependencyEntry(entry: string): ModuleDependencyLink | null {
  const separatorIndex = entry.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }

  const direction = entry.slice(0, separatorIndex);
  if (direction !== 'upstream' && direction !== 'downstream') {
    return null;
  }

  const value = entry.slice(separatorIndex + 1).trim();
  if (!value) {
    return null;
  }

  const [moduleIdOrName, ...signalParts] = value.split(':');
  const signal = signalParts.join(':').trim();
  return {
    direction,
    moduleId: moduleIdOrName.trim(),
    signal: signal.length > 0 ? signal : undefined
  };
}

function declaredDependencyKeys(modulePackage: ModulePackage): { upstream: Set<string>; downstream: Set<string> } {
  const declared = {
    upstream: new Set<string>(),
    downstream: new Set<string>()
  };

  for (const link of modulePackage.dependencies?.links ?? []) {
    const key = dependencyLinkKey(link);
    if (link.direction === 'upstream') {
      declared.upstream.add(key);
    } else {
      declared.downstream.add(key);
    }
  }

  if (declared.upstream.size > 0 || declared.downstream.size > 0) {
    return declared;
  }

  const legacyManagedEntries = splitDependencyNotes(modulePackage.dependencies?.relevantDependencies ?? []).managedEntries;
  for (const entry of legacyManagedEntries) {
    const parsed = parseLegacyDependencyEntry(entry);
    if (!parsed) {
      continue;
    }

    const normalized = {
      ...parsed,
      moduleId: cleanKey(parsed.moduleId),
      signal: parsed.signal ? cleanKey(parsed.signal) : undefined
    };

    if (parsed.direction === 'upstream') {
      declared.upstream.add(dependencyLinkKey(normalized));
    } else {
      declared.downstream.add(dependencyLinkKey(normalized));
    }
  }

  return declared;
}

export function validateSemanticDesign(snapshot: SemanticDesignSnapshot): SemanticValidationIssue[] {
  const issues: SemanticValidationIssue[] = [];
  const moduleIdSet = new Set(snapshot.moduleIds);

  for (const moduleId of snapshot.moduleIds) {
    const modulePackage = snapshot.packageContentByModuleId[moduleId];
    if (!modulePackage) {
      continue;
    }

    const seenPortNames = new Set<string>();
    for (const port of modulePackage.interfaces?.ports ?? []) {
      const normalizedPortName = cleanKey(port.name);
      if (!normalizedPortName) {
        continue;
      }

      if (seenPortNames.has(normalizedPortName)) {
        issues.push({
          code: 'duplicate_port_name',
          severity: 'error',
          moduleId,
          message: `Duplicate port name "${port.name}" found in module interfaces.`
        });
      } else {
        seenPortNames.add(normalizedPortName);
      }
    }

    if (requiresLeafCompleteness(modulePackage) && !hasPurpose(modulePackage)) {
      issues.push({
        code: 'leaf_missing_purpose',
        severity: 'error',
        moduleId,
        message: 'Approved leaf or leaf-ready module requires a purpose summary.'
      });
    }

    if (requiresLeafCompleteness(modulePackage) && !hasPorts(modulePackage)) {
      issues.push({
        code: 'leaf_missing_ports',
        severity: 'error',
        moduleId,
        message: 'Approved leaf or leaf-ready module must define at least one named port.'
      });
    }
  }

  for (const connection of snapshot.connections) {
    if (connection.fromModuleId === connection.toModuleId) {
      issues.push({
        code: 'self_connection',
        severity: 'error',
        moduleId: connection.fromModuleId,
        message: `Connection "${connection.signal}" cannot connect module to itself.`
      });
    }

    if (!moduleIdSet.has(connection.fromModuleId)) {
      issues.push({
        code: 'connection_missing_module',
        severity: 'error',
        moduleId: connection.toModuleId,
        message: `Connection source module "${connection.fromModuleId}" does not exist.`
      });
    }

    if (!moduleIdSet.has(connection.toModuleId)) {
      issues.push({
        code: 'connection_missing_module',
        severity: 'error',
        moduleId: connection.fromModuleId,
        message: `Connection target module "${connection.toModuleId}" does not exist.`
      });
    }
  }

  const expectedByModuleId = expectedDependencyLinks(snapshot.connections);

  for (const moduleId of snapshot.moduleIds) {
    const modulePackage = snapshot.packageContentByModuleId[moduleId];
    const expected = expectedByModuleId[moduleId] ?? { upstream: new Set<string>(), downstream: new Set<string>() };
    const declared = modulePackage ? declaredDependencyKeys(modulePackage) : { upstream: new Set<string>(), downstream: new Set<string>() };

    for (const expectedUpstream of expected.upstream) {
      if (!declared.upstream.has(expectedUpstream)) {
        issues.push({
          code: 'missing_dependency_for_connection',
          severity: 'warning',
          moduleId,
          message: `Missing dependency entry: ${expectedUpstream}.`
        });
      }
    }

    for (const expectedDownstream of expected.downstream) {
      if (!declared.downstream.has(expectedDownstream)) {
        issues.push({
          code: 'missing_dependency_for_connection',
          severity: 'warning',
          moduleId,
          message: `Missing dependency entry: ${expectedDownstream}.`
        });
      }
    }

    for (const upstream of declared.upstream) {
      if (!expected.upstream.has(upstream)) {
        issues.push({
          code: 'stale_dependency_entry',
          severity: 'warning',
          moduleId,
          message: `Dependency entry ${upstream} does not match active connections.`
        });
      }
    }

    for (const downstream of declared.downstream) {
      if (!expected.downstream.has(downstream)) {
        issues.push({
          code: 'stale_dependency_entry',
          severity: 'warning',
          moduleId,
          message: `Dependency entry ${downstream} does not match active connections.`
        });
      }
    }
  }

  return issues;
}
