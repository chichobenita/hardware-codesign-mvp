<<<<<<< HEAD
import type { DesignState } from '../types';
=======
import { type ModulePackage } from '../../../shared/src';
import { isHandoffArtifactRecord } from '../ai/handoffArtifacts';
import type { ModuleNode } from '../../../shared/src';
import type { Connection, DesignState } from '../types';
>>>>>>> origin/main
import { seedState } from './designReducer';
import { PERSISTED_DESIGN_SCHEMA_VERSION, type PersistedDesignSnapshot } from './migrations/migrationTypes';
import { migratePersistedDesignSnapshot } from './migrations/snapshotMigrations';
import { createRestoredDesignState } from './normalization/normalizeDesignState';

export const LOCAL_STORAGE_KEY = 'hardware-codesign-mvp.design-state.v1';
export { PERSISTED_DESIGN_SCHEMA_VERSION };

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;


export type SnapshotParseResult =
  | { ok: true; snapshot: PersistedDesignSnapshot }
  | { ok: false; reason: 'invalid_json' | 'invalid_shape' | 'unsupported_schema_version' | 'invalid_restore_state' };

function parseSnapshotRecord(parsed: unknown): SnapshotParseResult {
  const migrated = migratePersistedDesignSnapshot(parsed);
  if (!migrated.ok) {
    return migrated;
  }

  return {
    ok: true,
    snapshot: migrated.snapshot
  };
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
    return parseSnapshotRecord(parsed);
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
