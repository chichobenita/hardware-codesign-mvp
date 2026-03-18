import { describe, expect, it } from 'vitest';
import { designReducer, seedState } from '../state/designReducer';
import { createRestoredDesignState, normalizeDesignState } from '../state/normalization/normalizeDesignState';
import type { DesignState } from '../types';

function cloneSeedState(): DesignState {
  return structuredClone(seedState);
}

describe('shared design normalization', () => {
  it('projects module list identity from authoritative package identity', () => {
    const state = cloneSeedState();
    state.moduleList[1] = { ...state.moduleList[1]!, name: 'stale_projection' };
    state.packageContentByModuleId.child_a = {
      ...state.packageContentByModuleId.child_a,
      identity: { ...state.packageContentByModuleId.child_a.identity, name: 'authoritative_fifo' }
    };

    const normalized = normalizeDesignState(state, { ensureUi: true, ensureSuggestions: true });

    expect(normalized.moduleList.find((moduleNode) => moduleNode.id === 'child_a')?.name).toBe('authoritative_fifo');
    expect(normalized.ui.renameDraft).toBe(normalized.moduleList.find((moduleNode) => moduleNode.id === normalized.selectedModuleId)?.name ?? '');
  });

  it('reconstructs dependency links and display text from shared connection semantics', () => {
    const state = cloneSeedState();
    state.connections = [{ fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' }];
    state.packageContentByModuleId.child_a = {
      ...state.packageContentByModuleId.child_a,
      dependencies: { relevantDependencies: ['manual-note'], links: [] }
    };
    state.packageContentByModuleId.child_b = {
      ...state.packageContentByModuleId.child_b,
      identity: { ...state.packageContentByModuleId.child_b.identity, name: 'dispatch_scheduler' },
      dependencies: { relevantDependencies: [], links: [] }
    };

    const normalized = normalizeDesignState(state);

    expect(normalized.packageContentByModuleId.child_a.dependencies?.links).toContainEqual({
      direction: 'downstream',
      moduleId: 'child_b',
      signal: 'fifo_valid'
    });
    expect(normalized.packageContentByModuleId.child_a.dependencies?.relevantDependencies).toEqual([
      'manual-note',
      'downstream:dispatch_scheduler:fifo_valid'
    ]);
    expect(normalized.packageContentByModuleId.child_b.dependencies?.relevantDependencies).toEqual([
      'upstream:input_fifo:fifo_valid'
    ]);
  });


  it('keeps normalization hierarchy semantics aligned with reducer decomposition semantics', () => {
    let reducerState = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });
    reducerState = designReducer(reducerState, {
      type: 'decompose_selected_module',
      payload: { childNames: ['parser_stage'], childKind: 'leaf', nowIso: '2026-01-01T00:00:00.000Z' }
    });
    reducerState = designReducer(reducerState, {
      type: 'rename_module',
      payload: { moduleId: 'root', name: 'system_top', nowIso: '2026-01-01T00:00:01.000Z' }
    });

    const normalized = normalizeDesignState({
      ...reducerState,
      packageContentByModuleId: {
        ...reducerState.packageContentByModuleId,
        root: {
          ...reducerState.packageContentByModuleId.root,
          hierarchy: {
            ...reducerState.packageContentByModuleId.root.hierarchy,
            childModuleIds: []
          }
        }
      }
    });

    const parserModule = normalized.moduleList.find((moduleNode) => moduleNode.name === 'parser_stage');
    expect(parserModule).toBeDefined();
    expect(normalized.packageContentByModuleId.root.hierarchy?.childModuleIds).toContain(parserModule!.id);
    expect(normalized.packageContentByModuleId[parserModule!.id].hierarchy?.hierarchyPath).toEqual(['system_top', 'parser_stage']);
    expect(normalized.packageContentByModuleId.root.decompositionStatus?.decompositionStatus).toBe('composite');
  });

  it('keeps hierarchy view valid after import-style restore and rename semantics', () => {
    const restored = createRestoredDesignState({
      moduleList: [
        { id: 'root', name: 'stale_root', kind: 'composite' },
        { id: 'child', name: 'stale_child', kind: 'leaf' }
      ],
      selectedModuleId: 'child',
      connections: [],
      packageContentByModuleId: {
        root: {
          ...seedState.packageContentByModuleId.root,
          moduleId: 'root',
          packageId: 'pkg_root',
          identity: { name: 'fabric_top' },
          hierarchy: { parentModuleId: '', childModuleIds: ['child'], hierarchyPath: ['fabric_top'] }
        },
        child: {
          ...seedState.packageContentByModuleId.child_a,
          moduleId: 'child',
          packageId: 'pkg_child',
          identity: { name: 'decode_stage' },
          hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['fabric_top', 'decode_stage'] }
        }
      },
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    });

    expect(restored.ui.currentHierarchyModuleId).toBe('root');
    expect(restored.selectedModuleId).toBe('child');
    expect(restored.packageContentByModuleId.child.hierarchy?.hierarchyPath).toEqual(['fabric_top', 'decode_stage']);
  });

  it('keeps restore output semantically consistent with reducer-driven updates for equivalent inputs', () => {
    let reducerState = designReducer(seedState, {
      type: 'rename_module',
      payload: { moduleId: 'child_b', name: 'dispatch_scheduler', nowIso: '2026-01-01T00:00:00.000Z' }
    });
    reducerState = designReducer(reducerState, {
      type: 'connect_modules',
      payload: {
        connection: { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
        nowIso: '2026-01-01T00:00:01.000Z'
      }
    });

    const restoredState = createRestoredDesignState({
      moduleList: reducerState.moduleList.map((moduleNode) =>
        moduleNode.id === 'child_b' ? { ...moduleNode, name: 'stale_projection' } : moduleNode
      ),
      selectedModuleId: reducerState.selectedModuleId,
      connections: reducerState.connections,
      packageContentByModuleId: reducerState.packageContentByModuleId,
      handedOffAtByModuleId: reducerState.handedOffAtByModuleId,
      handoffArtifacts: reducerState.handoffArtifacts
    });

    expect(restoredState.moduleList).toEqual(reducerState.moduleList);
    expect(restoredState.connections).toEqual(reducerState.connections);
    expect(restoredState.packageContentByModuleId.child_a.dependencies).toEqual(
      reducerState.packageContentByModuleId.child_a.dependencies
    );
    expect(restoredState.packageContentByModuleId.child_b.dependencies).toEqual(
      reducerState.packageContentByModuleId.child_b.dependencies
    );
    expect(restoredState.packageContentByModuleId.child_b.identity?.name).toBe('dispatch_scheduler');
  });
});
