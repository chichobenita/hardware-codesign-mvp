import {
  dependencyLink,
  getAuthoritativeModuleName,
  mergeDependencyLinks,
  syncDependencyDisplayEntries,
  type ModuleDependencyLink,
  type ModulePackage,
  type PackageStatus
} from '../../../shared/src';
import type { Connection, DesignState, ModuleNode } from '../types';
import { seedState } from './designReducer';

export const LOCAL_STORAGE_KEY = 'hardware-codesign-mvp.design-state.v1';
export const PERSISTED_DESIGN_SCHEMA_VERSION = 1;

/**
 * Suggestions remain intentionally non-persisted in the MVP.
 * They are derived UI collaboration state and can be regenerated after restore.
 */
export type PersistedDesignSnapshot = {
  schemaVersion: number;
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
};

type LegacyPersistedDesignSnapshot = Omit<PersistedDesignSnapshot, 'schemaVersion'>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type ParsedSnapshot = PersistedDesignSnapshot | LegacyPersistedDesignSnapshot;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isModuleNode(value: unknown): value is ModuleNode {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.kind === 'composite' || value.kind === 'leaf')
  );
}

function isConnection(value: unknown): value is Connection {
  return (
    isRecord(value)
    && typeof value.fromModuleId === 'string'
    && typeof value.toModuleId === 'string'
    && typeof value.signal === 'string'
  );
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isModuleDependencyLink(value: unknown): value is ModuleDependencyLink {
  return (
    isRecord(value)
    && (value.direction === 'upstream' || value.direction === 'downstream')
    && typeof value.moduleId === 'string'
    && (value.signal === undefined || typeof value.signal === 'string')
  );
}

function normalizePackageStatus(value: unknown): PackageStatus {
  return value === 'draft'
    || value === 'partially_defined'
    || value === 'under_review'
    || value === 'approved'
    || value === 'leaf_ready'
    || value === 'handed_off'
    ? value
    : 'draft';
}

function isPackageMap(value: unknown): value is Record<string, ModulePackage> {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item));
}

function parseSnapshot(raw: string): ParsedSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    const schemaVersion = parsed.schemaVersion;
    if (schemaVersion !== undefined && schemaVersion !== PERSISTED_DESIGN_SCHEMA_VERSION) {
      return null;
    }

    if (!Array.isArray(parsed.moduleList) || !parsed.moduleList.every(isModuleNode)) {
      return null;
    }
    if (typeof parsed.selectedModuleId !== 'string') {
      return null;
    }
    if (!Array.isArray(parsed.connections) || !parsed.connections.every(isConnection)) {
      return null;
    }
    if (!isPackageMap(parsed.packageContentByModuleId)) {
      return null;
    }

    const handedOffAtByModuleId = isStringMap(parsed.handedOffAtByModuleId) ? parsed.handedOffAtByModuleId : {};

    return {
      schemaVersion: typeof schemaVersion === 'number' ? schemaVersion : PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: parsed.moduleList,
      selectedModuleId: parsed.selectedModuleId,
      connections: parsed.connections,
      packageContentByModuleId: parsed.packageContentByModuleId,
      handedOffAtByModuleId
    };
  } catch {
    return null;
  }
}

function createDefaultModulePackage(moduleNode: ModuleNode, existingPackage?: ModulePackage): ModulePackage {
  const moduleName = getAuthoritativeModuleName(moduleNode.id, existingPackage, moduleNode.name);

  return {
    packageId: existingPackage?.packageId ?? `pkg_${moduleNode.id}`,
    moduleId: moduleNode.id,
    packageVersion: existingPackage?.packageVersion ?? '0.1.0',
    packageStatus: normalizePackageStatus(existingPackage?.packageStatus),
    lastUpdatedAt: existingPackage?.lastUpdatedAt ?? '',
    lastUpdatedBy: existingPackage?.lastUpdatedBy ?? 'restored_snapshot',
    identity: {
      ...existingPackage?.identity,
      name: moduleName
    },
    hierarchy: {
      parentModuleId: existingPackage?.hierarchy?.parentModuleId ?? '',
      childModuleIds: isStringArray(existingPackage?.hierarchy?.childModuleIds) ? existingPackage?.hierarchy?.childModuleIds : [],
      hierarchyPath: isStringArray(existingPackage?.hierarchy?.hierarchyPath) ? existingPackage?.hierarchy?.hierarchyPath : [moduleName]
    },
    interfaces: {
      ports: Array.isArray(existingPackage?.interfaces?.ports) ? existingPackage.interfaces?.ports ?? [] : []
    },
    purpose: {
      summary: existingPackage?.purpose?.summary ?? ''
    },
    constraints: {
      basicConstraints: isStringArray(existingPackage?.constraints?.basicConstraints) ? existingPackage?.constraints?.basicConstraints : []
    },
    dependencies: {
      links: Array.isArray(existingPackage?.dependencies?.links)
        ? existingPackage.dependencies.links.filter(isModuleDependencyLink)
        : [],
      relevantDependencies: isStringArray(existingPackage?.dependencies?.relevantDependencies)
        ? existingPackage.dependencies.relevantDependencies
        : []
    },
    behavior: {
      behaviorSummary: existingPackage?.behavior?.behaviorSummary ?? '',
      operationalDescription: existingPackage?.behavior?.operationalDescription ?? '',
      behaviorRules: isStringArray(existingPackage?.behavior?.behaviorRules) ? existingPackage?.behavior?.behaviorRules : [],
      clockResetNotes: existingPackage?.behavior?.clockResetNotes ?? ''
    },
    decompositionStatus: existingPackage?.decompositionStatus
      ? {
          decompositionStatus: existingPackage.decompositionStatus.decompositionStatus,
          decompositionRationale: existingPackage.decompositionStatus.decompositionRationale ?? '',
          stopReason: existingPackage.decompositionStatus.stopReason,
          stopRecommendedBy: existingPackage.decompositionStatus.stopRecommendedBy,
          furtherDecompositionNotes: existingPackage.decompositionStatus.furtherDecompositionNotes
        }
      : { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
  };
}

function normalizeDependencies(
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

function normalizeRestoredState(snapshot: ParsedSnapshot): DesignState | null {
  if (snapshot.moduleList.length === 0) {
    return null;
  }

  const moduleIds = new Set(snapshot.moduleList.map((moduleNode) => moduleNode.id));
  if (!moduleIds.has(snapshot.selectedModuleId)) {
    return null;
  }

  const validConnections = snapshot.connections.filter(
    (connection) => moduleIds.has(connection.fromModuleId) && moduleIds.has(connection.toModuleId)
  );

  const normalizedModuleList = snapshot.moduleList.map((moduleNode) => {
    const modulePackage = snapshot.packageContentByModuleId[moduleNode.id];
    if (!modulePackage) {
      return null;
    }

    const moduleName = getAuthoritativeModuleName(moduleNode.id, modulePackage, moduleNode.name);
    return {
      ...moduleNode,
      name: moduleName
    };
  });

  if (normalizedModuleList.some((moduleNode) => moduleNode === null)) {
    return null;
  }

  const normalizedPackages = Object.fromEntries(
    (normalizedModuleList as ModuleNode[]).map((moduleNode) => [
      moduleNode.id,
      createDefaultModulePackage(moduleNode, snapshot.packageContentByModuleId[moduleNode.id])
    ])
  ) as Record<string, ModulePackage>;

  return {
    moduleList: normalizedModuleList as ModuleNode[],
    selectedModuleId: snapshot.selectedModuleId,
    connections: validConnections,
    packageContentByModuleId: normalizeDependencies(normalizedPackages, validConnections),
    handedOffAtByModuleId: Object.fromEntries(
      Object.entries(snapshot.handedOffAtByModuleId).filter(([moduleId]) => moduleIds.has(moduleId))
    ),
    suggestionsByModuleId: {}
  };
}

export function loadDesignState(storage: StorageLike = window.localStorage): DesignState {
  const raw = storage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return seedState;
  }

  const parsedSnapshot = parseSnapshot(raw);
  if (!parsedSnapshot) {
    return seedState;
  }

  return normalizeRestoredState(parsedSnapshot) ?? seedState;
}

export function saveDesignState(state: DesignState, storage: StorageLike = window.localStorage): void {
  const snapshot: PersistedDesignSnapshot = {
    schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
    moduleList: state.moduleList,
    selectedModuleId: state.selectedModuleId,
    connections: state.connections,
    packageContentByModuleId: state.packageContentByModuleId,
    handedOffAtByModuleId: state.handedOffAtByModuleId
  };

  storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
}
