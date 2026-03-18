import { describe, expect, it } from 'vitest';
import { createPersistedDesignSnapshot, importDesignState, loadDesignState, LOCAL_STORAGE_KEY, PERSISTED_DESIGN_SCHEMA_VERSION, saveDesignState, serializeDesignSnapshot } from '../state/designPersistence';
import { seedState } from '../state/designReducer';
import type { DesignState } from '../types';

type StorageMock = {
  data: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function createStorageMock(initialValue?: string): StorageMock {
  const data: Record<string, string> = {};
  if (initialValue !== undefined) {
    data[LOCAL_STORAGE_KEY] = initialValue;
  }

  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    }
  };
}

function cloneSeedState(): DesignState {
  return structuredClone(seedState);
}

describe('designPersistence', () => {


  it('exports the expected versioned snapshot shape', () => {
    const state = cloneSeedState();
    state.suggestionsByModuleId.root = [
      {
        id: 'suggestion-1',
        type: 'purpose_proposal',
        title: 'Ignored suggestion',
        description: 'Should not persist',
        status: 'pending',
        draft: { summaryText: 'ignore me' }
      }
    ];

    const snapshot = createPersistedDesignSnapshot(state);
    const serialized = JSON.parse(serializeDesignSnapshot(state));

    expect(snapshot.schemaVersion).toBe(PERSISTED_DESIGN_SCHEMA_VERSION);
    expect(snapshot).not.toHaveProperty('suggestionsByModuleId');
    expect(serialized).toEqual(snapshot);
  });

  it('imports a valid snapshot through the same restore semantics as persistence restore', () => {
    const snapshot = {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: [{ id: 'child', name: 'stale_list_name', kind: 'leaf' }],
      selectedModuleId: 'child',
      connections: [],
      packageContentByModuleId: {
        child: {
          packageId: 'pkg_child',
          moduleId: 'child',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'normalized_name' }
        }
      },
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    };

    const imported = importDesignState(JSON.stringify(snapshot));
    const restored = loadDesignState(createStorageMock(JSON.stringify(snapshot)));

    expect(imported.ok).toBe(true);
    expect(imported.state).toEqual(restored);
    expect(imported.state?.moduleList[0]?.name).toBe('normalized_name');
    expect(imported.state?.suggestionsByModuleId).toEqual({});
    expect(imported.state?.ui.currentHierarchyModuleId).toBe('child');
  });

  it('fails safely for unsupported snapshot versions', () => {
    const imported = importDesignState(
      JSON.stringify({
        schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION + 1,
        moduleList: [],
        selectedModuleId: 'root',
        connections: [],
        packageContentByModuleId: {},
        handedOffAtByModuleId: {},
        handoffArtifacts: []
      })
    );

    expect(imported).toEqual({ ok: false, reason: 'unsupported_schema_version' });
  });

  it('loads a valid persisted snapshot', () => {
    const snapshot = {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: [
        { id: 'root', name: 'legacy_root_name', kind: 'composite' },
        { id: 'child', name: 'legacy_child_name', kind: 'leaf' }
      ],
      selectedModuleId: 'child',
      connections: [{ fromModuleId: 'root', toModuleId: 'child', signal: 'bus' }],
      packageContentByModuleId: {
        root: {
          packageId: 'pkg_root',
          moduleId: 'root',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'top_controller' },
          dependencies: { relevantDependencies: [], links: [] }
        },
        child: {
          packageId: 'pkg_child',
          moduleId: 'child',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'restored_child' },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      handedOffAtByModuleId: { child: '2026-03-18T00:00:00.000Z' },
      handoffArtifacts: []
    };

    const storage = createStorageMock(JSON.stringify(snapshot));
    const restored = loadDesignState(storage);

    expect(restored.selectedModuleId).toBe('child');
    expect(restored.moduleList).toEqual([
      { id: 'root', name: 'top_controller', kind: 'composite' },
      { id: 'child', name: 'restored_child', kind: 'leaf' }
    ]);
    expect(restored.suggestionsByModuleId).toEqual({});
    expect(restored.handedOffAtByModuleId).toEqual({ child: '2026-03-18T00:00:00.000Z' });
  });

  it('falls back to seed state for invalid snapshots', () => {
    const storage = createStorageMock('{not-valid-json');

    expect(loadDesignState(storage)).toEqual(seedState);
  });

  it('normalizes module identity projection on restore', () => {
    const snapshot = {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: [{ id: 'child', name: 'stale_list_name', kind: 'leaf' }],
      selectedModuleId: 'child',
      connections: [],
      packageContentByModuleId: {
        child: {
          packageId: 'pkg_child',
          moduleId: 'child',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'authoritative_name' }
        }
      },
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    };

    const restored = loadDesignState(createStorageMock(JSON.stringify(snapshot)));

    expect(restored.moduleList[0]?.name).toBe('authoritative_name');
    expect(restored.packageContentByModuleId.child.identity?.name).toBe('authoritative_name');
  });

  it('normalizes dependency semantics on restore', () => {
    const snapshot = {
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: [
        { id: 'producer', name: 'producer', kind: 'leaf' },
        { id: 'consumer', name: 'consumer', kind: 'leaf' }
      ],
      selectedModuleId: 'producer',
      connections: [{ fromModuleId: 'producer', toModuleId: 'consumer', signal: 'data_bus' }],
      packageContentByModuleId: {
        producer: {
          packageId: 'pkg_producer',
          moduleId: 'producer',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'producer' },
          dependencies: { relevantDependencies: ['custom-note'], links: [] }
        },
        consumer: {
          packageId: 'pkg_consumer',
          moduleId: 'consumer',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'consumer' },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    };

    const restored = loadDesignState(createStorageMock(JSON.stringify(snapshot)));

    expect(restored.packageContentByModuleId.producer.dependencies?.links).toEqual([
      { direction: 'downstream', moduleId: 'consumer', signal: 'data_bus' }
    ]);
    expect(restored.packageContentByModuleId.producer.dependencies?.relevantDependencies).toEqual([
      'custom-note',
      'downstream:consumer:data_bus'
    ]);
    expect(restored.packageContentByModuleId.consumer.dependencies?.links).toEqual([
      { direction: 'upstream', moduleId: 'producer', signal: 'data_bus' }
    ]);
    expect(restored.packageContentByModuleId.consumer.dependencies?.relevantDependencies).toEqual([
      'upstream:producer:data_bus'
    ]);
  });

  it('roundtrips the current MVP state shape through save and load', () => {
    const state = cloneSeedState();
    state.suggestionsByModuleId.root = [
      {
        id: 'suggestion-1',
        type: 'purpose_proposal',
        title: 'Ignored suggestion',
        description: 'Should not persist',
        status: 'pending',
        draft: { summaryText: 'ignore me' }
      }
    ];

    const storage = createStorageMock();
    saveDesignState(state, storage);
    const raw = storage.data[LOCAL_STORAGE_KEY];
    const savedSnapshot = JSON.parse(raw);

    expect(savedSnapshot.schemaVersion).toBe(PERSISTED_DESIGN_SCHEMA_VERSION);
    expect(savedSnapshot.suggestionsByModuleId).toBeUndefined();

    const restored = loadDesignState(storage);
    expect(restored.suggestionsByModuleId).toEqual({});
    expect(restored.moduleList).toEqual(seedState.moduleList);
    expect(restored.connections).toEqual(seedState.connections);
    expect(restored.handedOffAtByModuleId).toEqual(seedState.handedOffAtByModuleId);
  });
});
