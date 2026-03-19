import type { ModulePackage, ModuleNode } from '../../../../shared/src';
import type { HandoffArtifact } from '../../ai/handoffTypes';
import type { Connection } from '../../types';

export const PERSISTED_DESIGN_SCHEMA_VERSION = 2;

export type PersistedDesignSnapshot = {
  schemaVersion: typeof PERSISTED_DESIGN_SCHEMA_VERSION;
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
  handoffArtifacts: HandoffArtifact[];
};

export type LegacyPersistedDesignSnapshotV1 = {
  schemaVersion?: 1;
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId?: Record<string, string>;
  handoffArtifacts?: unknown[];
};

export type SnapshotMigrationFailureReason = 'invalid_shape' | 'unsupported_schema_version';

export type SnapshotMigrationResult =
  | { ok: true; snapshot: PersistedDesignSnapshot; migratedFromVersion: 1 | 2 | 'unversioned' }
  | { ok: false; reason: SnapshotMigrationFailureReason };
