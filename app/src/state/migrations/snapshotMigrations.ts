import type { ModulePackage, ModuleNode } from '../../../../shared/src';
import { isHandoffArtifactRecord } from '../../ai/handoffArtifacts';
import type { Connection } from '../../types';
import {
  PERSISTED_DESIGN_SCHEMA_VERSION,
  type SnapshotMigrationResult
} from './migrationTypes';

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

function parseCoreSnapshotFields(parsed: Record<string, unknown>) {
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

  return {
    moduleList: parsed.moduleList,
    selectedModuleId: parsed.selectedModuleId,
    connections: parsed.connections,
    packageContentByModuleId: parsed.packageContentByModuleId
  };
}

function migrateLegacySnapshot(
  parsed: Record<string, unknown>,
  migratedFromVersion: 1 | 'unversioned'
): SnapshotMigrationResult {
  const core = parseCoreSnapshotFields(parsed);
  if (!core) {
    return { ok: false, reason: 'invalid_shape' };
  }

  return {
    ok: true,
    migratedFromVersion,
    snapshot: {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      ...core,
      handedOffAtByModuleId: isStringMap(parsed.handedOffAtByModuleId) ? parsed.handedOffAtByModuleId : {},
      handoffArtifacts: Array.isArray(parsed.handoffArtifacts)
        ? parsed.handoffArtifacts.filter(isHandoffArtifactRecord)
        : []
    }
  };
}

function migrateCurrentSnapshot(parsed: Record<string, unknown>): SnapshotMigrationResult {
  const core = parseCoreSnapshotFields(parsed);
  if (!core) {
    return { ok: false, reason: 'invalid_shape' };
  }

  return {
    ok: true,
    migratedFromVersion: 2,
    snapshot: {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      ...core,
      handedOffAtByModuleId: isStringMap(parsed.handedOffAtByModuleId) ? parsed.handedOffAtByModuleId : {},
      handoffArtifacts: Array.isArray(parsed.handoffArtifacts)
        ? parsed.handoffArtifacts.filter(isHandoffArtifactRecord)
        : []
    }
  };
}

export function migratePersistedDesignSnapshot(parsed: unknown): SnapshotMigrationResult {
  if (!isRecord(parsed)) {
    return { ok: false, reason: 'invalid_shape' };
  }

  if (parsed.schemaVersion === undefined) {
    return migrateLegacySnapshot(parsed, 'unversioned');
  }

  if (parsed.schemaVersion === 1) {
    return migrateLegacySnapshot(parsed, 1);
  }

  if (parsed.schemaVersion === PERSISTED_DESIGN_SCHEMA_VERSION) {
    return migrateCurrentSnapshot(parsed);
  }

  return { ok: false, reason: 'unsupported_schema_version' };
}
