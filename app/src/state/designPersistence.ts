import type { ModulePackage } from '../../../shared/src';
import type { Connection, DesignState, ModuleNode } from '../types';
import { seedState } from './designReducer';
import { createRestoredDesignState } from './normalization/normalizeDesignState';
import {
  PERSISTED_DESIGN_SCHEMA_VERSION,
  type PersistedDesignSnapshot
} from './migrations/migrationTypes';
import { migratePersistedDesignSnapshot } from './migrations/snapshotMigrations';

export const LOCAL_STORAGE_KEY = 'hardware-codesign-mvp.design-state.v1';
export { PERSISTED_DESIGN_SCHEMA_VERSION };

/**
 * Suggestions, proposals, chat transcript, UI drafts, and provider jobs remain intentionally non-persisted in the MVP.
 * They are derived collaboration state and can be regenerated after restore.
 */
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export type SnapshotParseResult =
  | { ok: true; snapshot: PersistedDesignSnapshot }
  | { ok: false; reason: 'invalid_json' | 'invalid_shape' | 'unsupported_schema_version' | 'invalid_restore_state' };

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

function isPackageMap(value: unknown): value is Record<string, ModulePackage> {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item));
}

function normalizeRestoredState(snapshot: PersistedDesignSnapshot): DesignState | null {
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
    ),
    handoffArtifacts: snapshot.handoffArtifacts.filter((artifact) => moduleIds.has(artifact.moduleId))
  });
}

export function createPersistedDesignSnapshot(state: DesignState): PersistedDesignSnapshot {
  return {
    schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
    moduleList: state.moduleList,
    selectedModuleId: state.selectedModuleId,
    connections: state.connections,
    packageContentByModuleId: state.packageContentByModuleId,
    handedOffAtByModuleId: state.handedOffAtByModuleId,
    handoffArtifacts: state.handoffArtifacts
  };
}

export function serializeDesignSnapshot(state: DesignState): string {
  return JSON.stringify(createPersistedDesignSnapshot(state), null, 2);
}

export function parsePersistedDesignSnapshot(raw: string): SnapshotParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migratePersistedDesignSnapshot(parsed);
    if (!migrated.ok) {
      return migrated;
    }

    if (
      !Array.isArray(migrated.snapshot.moduleList) || !migrated.snapshot.moduleList.every(isModuleNode)
      || !Array.isArray(migrated.snapshot.connections) || !migrated.snapshot.connections.every(isConnection)
      || !isPackageMap(migrated.snapshot.packageContentByModuleId)
    ) {
      return { ok: false, reason: 'invalid_shape' };
    }

    return { ok: true, snapshot: migrated.snapshot };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
}

export function restoreDesignStateFromSnapshot(snapshot: PersistedDesignSnapshot): SnapshotParseResult & { state?: DesignState } {
  const restoredState = normalizeRestoredState(snapshot);
  if (!restoredState) {
    return { ok: false, reason: 'invalid_restore_state' };
  }

  return { ok: true, snapshot, state: restoredState };
}

export function importDesignState(raw: string): SnapshotParseResult & { state?: DesignState } {
  const parsedSnapshot = parsePersistedDesignSnapshot(raw);
  if (!parsedSnapshot.ok) {
    return parsedSnapshot;
  }

  return restoreDesignStateFromSnapshot(parsedSnapshot.snapshot);
}

export function loadDesignState(storage: StorageLike = window.localStorage): DesignState {
  const raw = storage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return seedState;
  }

  const imported = importDesignState(raw);
  if (!imported.ok || !imported.state) {
    return seedState;
  }

  return imported.state;
}

export function saveDesignState(state: DesignState, storage: StorageLike = window.localStorage): void {
  storage.setItem(LOCAL_STORAGE_KEY, serializeDesignSnapshot(state));
}
