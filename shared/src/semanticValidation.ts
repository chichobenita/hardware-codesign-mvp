import type { ModulePackage } from './types';

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

type DependencyShape = {
  upstream: Set<string>;
  downstream: Set<string>;
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

function parseDependencyEntry(entry: string): { kind: 'upstream' | 'downstream'; value: string } | null {
  const separatorIndex = entry.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }

  const kind = entry.slice(0, separatorIndex);
  if (kind !== 'upstream' && kind !== 'downstream') {
    return null;
  }

  const value = entry.slice(separatorIndex + 1).trim();
  if (!value) {
    return null;
  }

  return { kind, value };
}

function expectedDependencies(snapshot: SemanticDesignSnapshot): Record<string, DependencyShape> {
  const expected: Record<string, DependencyShape> = {};
  for (const moduleId of snapshot.moduleIds) {
    expected[moduleId] = { upstream: new Set<string>(), downstream: new Set<string>() };
  }

  for (const connection of snapshot.connections) {
    if (!expected[connection.fromModuleId] || !expected[connection.toModuleId]) {
      continue;
    }

    const sourcePackage = snapshot.packageContentByModuleId[connection.fromModuleId];
    const targetPackage = snapshot.packageContentByModuleId[connection.toModuleId];
    if (!sourcePackage || !targetPackage) {
      continue;
    }

    const sourceName = sourcePackage.identity?.name ?? connection.fromModuleId;
    const targetName = targetPackage.identity?.name ?? connection.toModuleId;
    const cleanSignal = connection.signal.trim();

    const downstreamDependency = cleanSignal.length > 0 ? `${targetName}:${cleanSignal}` : targetName;
    const upstreamDependency = cleanSignal.length > 0 ? `${sourceName}:${cleanSignal}` : sourceName;

    expected[connection.fromModuleId].downstream.add(cleanKey(downstreamDependency));
    expected[connection.toModuleId].upstream.add(cleanKey(upstreamDependency));
  }

  return expected;
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

  const expectedByModuleId = expectedDependencies(snapshot);

  for (const moduleId of snapshot.moduleIds) {
    const modulePackage = snapshot.packageContentByModuleId[moduleId];
    const dependencyEntries = modulePackage?.dependencies?.relevantDependencies ?? [];
    const expected = expectedByModuleId[moduleId];

    if (!expected) {
      continue;
    }

    const declaredUpstream = new Set<string>();
    const declaredDownstream = new Set<string>();

    for (const entry of dependencyEntries) {
      const parsed = parseDependencyEntry(entry);
      if (!parsed) {
        continue;
      }

      const normalizedValue = cleanKey(parsed.value);
      if (parsed.kind === 'upstream') {
        declaredUpstream.add(normalizedValue);
      } else {
        declaredDownstream.add(normalizedValue);
      }
    }

    for (const expectedUpstream of expected.upstream) {
      if (!declaredUpstream.has(expectedUpstream)) {
        issues.push({
          code: 'missing_dependency_for_connection',
          severity: 'warning',
          moduleId,
          message: `Missing dependency entry: upstream:${expectedUpstream}.`
        });
      }
    }

    for (const expectedDownstream of expected.downstream) {
      if (!declaredDownstream.has(expectedDownstream)) {
        issues.push({
          code: 'missing_dependency_for_connection',
          severity: 'warning',
          moduleId,
          message: `Missing dependency entry: downstream:${expectedDownstream}.`
        });
      }
    }

    for (const upstream of declaredUpstream) {
      if (!expected.upstream.has(upstream)) {
        issues.push({
          code: 'stale_dependency_entry',
          severity: 'warning',
          moduleId,
          message: `Dependency entry upstream:${upstream} does not match active connections.`
        });
      }
    }

    for (const downstream of declaredDownstream) {
      if (!expected.downstream.has(downstream)) {
        issues.push({
          code: 'stale_dependency_entry',
          severity: 'warning',
          moduleId,
          message: `Dependency entry downstream:${downstream} does not match active connections.`
        });
      }
    }
  }

  return issues;
}
