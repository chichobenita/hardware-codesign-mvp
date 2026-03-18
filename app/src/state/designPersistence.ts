import { type ModulePackage } from '../../../shared/src';
import type { Connection, DesignState, ModuleNode } from '../types';
import { seedState } from './designReducer';
import { createRestoredDesignState } from './normalization/normalizeDesignState';

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

function normalizeRestoredState(snapshot: ParsedSnapshot): DesignState | null {
  if (snapshot.moduleList.length === 0) {
    return null;
  }

  const moduleIds = new Set(snapshot.moduleList.map((moduleNode) => moduleNode.id));
  if (!moduleIds.has(snapshot.selectedModuleId)) {
    return null;
  }

  return createRestoredDesignState({
    moduleList: snapshot.moduleList,
    selectedModuleId: snapshot.selectedModuleId,
    connections: snapshot.connections.filter(
      (connection) => moduleIds.has(connection.fromModuleId) && moduleIds.has(connection.toModuleId)
    ),
    packageContentByModuleId: snapshot.packageContentByModuleId,
    handedOffAtByModuleId: Object.fromEntries(
      Object.entries(snapshot.handedOffAtByModuleId).filter(([moduleId]) => moduleIds.has(moduleId))
    )
  });
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
