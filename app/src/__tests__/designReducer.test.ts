import { describe, expect, it } from 'vitest';
import { designReducer, seedState } from '../state/designReducer';
import type { DesignState } from '../types';

function cloneSeedState(): DesignState {
  return structuredClone(seedState);
}

describe('designReducer', () => {
  it('creates a module and selects it', () => {
    const state = designReducer(seedState, {
      type: 'create_module',
      payload: { name: 'new_unit', kind: 'leaf', parentModuleId: 'root', nextId: 'new_unit_1', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.moduleList.some((moduleNode) => moduleNode.id === 'new_unit_1')).toBe(true);
    expect(state.selectedModuleId).toBe('new_unit_1');
    expect(state.packageContentByModuleId.new_unit_1.identity?.name).toBe('new_unit');
    expect(state.packageContentByModuleId.new_unit_1.hierarchy?.parentModuleId).toBe('root');
    expect(state.packageContentByModuleId.root.hierarchy?.childModuleIds).toContain('new_unit_1');
  });

  it('renames a module and keeps package identity synchronized as source of truth', () => {
    const state = designReducer(seedState, {
      type: 'rename_module',
      payload: { moduleId: 'child_a', name: 'input_buffer', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.moduleList.find((moduleNode) => moduleNode.id === 'child_a')?.name).toBe('input_buffer');
    expect(state.packageContentByModuleId.child_a.identity?.name).toBe('input_buffer');
    expect(state.packageContentByModuleId.child_a.hierarchy?.hierarchyPath).toEqual(['top_controller', 'input_buffer']);
  });


  it('updates descendant hierarchy paths when an ancestor is renamed', () => {
    let state = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });
    state = designReducer(state, {
      type: 'decompose_selected_module',
      payload: { childNames: ['control_slice'], childKind: 'composite', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    const controlSlice = state.moduleList.find((moduleNode) => moduleNode.name === 'control_slice');
    expect(controlSlice).toBeDefined();

    state = designReducer(state, {
      type: 'rename_module',
      payload: { moduleId: 'root', name: 'system_top', nowIso: '2026-01-01T00:00:01.000Z' }
    });

    expect(state.packageContentByModuleId.child_a.hierarchy?.hierarchyPath).toEqual(['system_top', 'input_fifo']);
    expect(state.packageContentByModuleId[controlSlice!.id].hierarchy?.hierarchyPath).toEqual(['system_top', 'control_slice']);
  });

  it('keeps decomposed parents composite even after direct package edits', () => {
    let state = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });
    state = designReducer(state, {
      type: 'decompose_selected_module',
      payload: { childNames: ['parser_stage'], childKind: 'leaf', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    state = designReducer(state, {
      type: 'update_module_package',
      payload: {
        moduleId: 'root',
        updater: (current) => ({
          ...current,
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'stale manual edit' }
        }),
        nowIso: '2026-01-01T00:00:01.000Z'
      }
    });

    expect(state.packageContentByModuleId.root.decompositionStatus?.decompositionStatus).toBe('composite');
    expect(state.packageContentByModuleId.root.hierarchy?.childModuleIds?.length ?? 0).toBeGreaterThan(0);
  });

  it('keeps module list projection synchronized when package identity changes directly', () => {
    const state = designReducer(seedState, {
      type: 'update_module_package',
      payload: {
        moduleId: 'child_b',
        updater: (current) => ({
          ...current,
          identity: { ...current.identity, name: 'dispatch_scheduler' }
        }),
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(state.packageContentByModuleId.child_b.identity?.name).toBe('dispatch_scheduler');
    expect(state.moduleList.find((moduleNode) => moduleNode.id === 'child_b')?.name).toBe('dispatch_scheduler');
  });

  it('selects a module', () => {
    const state = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });

    expect(state.selectedModuleId).toBe('root');
  });

  it('updates workspace mode deterministically', () => {
    let state = cloneSeedState();

    state = designReducer(state, {
      type: 'set_workspace_mode',
      payload: { mode: 'review' }
    });
    expect(state.ui.workspaceMode).toBe('review');

    state = designReducer(state, {
      type: 'set_workspace_mode',
      payload: { mode: 'handoff' }
    });
    expect(state.ui.workspaceMode).toBe('handoff');
  });

  it('updates hierarchy navigation state through reducer actions', () => {
    const entered = designReducer(seedState, {
      type: 'enter_hierarchy_view',
      payload: { moduleId: 'root' }
    });

    expect(entered.ui.currentHierarchyModuleId).toBe('root');
    expect(entered.selectedModuleId).toBe('root');

    const decomposed = designReducer(entered, {
      type: 'decompose_selected_module',
      payload: { childNames: ['control_slice'], childKind: 'composite', nowIso: '2026-01-01T00:00:00.000Z' }
    });
    const controlSlice = decomposed.moduleList.find((moduleNode) => moduleNode.name === 'control_slice');
    expect(controlSlice).toBeDefined();

    const nested = designReducer({ ...decomposed, selectedModuleId: controlSlice!.id }, {
      type: 'enter_hierarchy_view',
      payload: { moduleId: controlSlice!.id }
    });
    expect(nested.ui.currentHierarchyModuleId).toBe(controlSlice!.id);

    const backedUp = designReducer(nested, {
      type: 'navigate_to_parent_hierarchy',
      payload: {}
    });
    expect(backedUp.ui.currentHierarchyModuleId).toBe('root');
    expect(backedUp.selectedModuleId).toBe('root');
  });

  it('updates the new module draft fields without affecting existing module data', () => {
    let state = cloneSeedState();

    state = designReducer(state, {
      type: 'set_new_module_name',
      payload: { value: 'dma_engine' }
    });
    state = designReducer(state, {
      type: 'set_new_module_kind',
      payload: { value: 'composite' }
    });

    expect(state.ui.newModuleName).toBe('dma_engine');
    expect(state.ui.newModuleKind).toBe('composite');
    expect(state.packageContentByModuleId.example_uart_rx.identity?.name).toBe('uart_rx');
  });

  it('updates decomposition draft fields through the reducer-owned UI slice', () => {
    let state = cloneSeedState();
    state = designReducer(state, { type: 'set_decomposition_names_text', payload: { value: 'parser, arbiter' } });
    state = designReducer(state, { type: 'set_decomposition_child_kind', payload: { value: 'composite' } });

    expect(state.ui.decompositionDraft.namesText).toBe('parser, arbiter');
    expect(state.ui.decompositionDraft.childKind).toBe('composite');
  });

  it('updates the rename draft directly through the reducer-owned UI slice', () => {
    const state = designReducer(seedState, {
      type: 'set_rename_draft',
      payload: { value: 'uart_receiver_v2' }
    });

    expect(state.ui.renameDraft).toBe('uart_receiver_v2');
  });

  it('updates the connection draft directly through the reducer-owned UI slice', () => {
    const draft = { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' };
    const state = designReducer(seedState, {
      type: 'set_connection_draft',
      payload: { value: draft }
    });

    expect(state.ui.connectionDraft).toEqual(draft);
  });

  it('refreshes rename draft from the current authoritative module identity when selection changes', () => {
    const selectedRoot = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });

    expect(selectedRoot.ui.renameDraft).toBe('top_controller');

    const renamedSelection = designReducer(selectedRoot, {
      type: 'update_module_package',
      payload: {
        moduleId: 'root',
        updater: (current) => ({
          ...current,
          identity: { ...current.identity, name: 'system_top' }
        }),
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(renamedSelection.moduleList.find((moduleNode) => moduleNode.id === 'root')?.name).toBe('system_top');
    expect(renamedSelection.ui.renameDraft).toBe('system_top');
  });

  it('keeps rename-related UI state coherent when module identity changes after a manual draft edit', () => {
    const selectedChild = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'child_b' }
    });
    const withManualDraft = designReducer(selectedChild, {
      type: 'set_rename_draft',
      payload: { value: 'temporary_user_text' }
    });

    const renamed = designReducer(withManualDraft, {
      type: 'rename_module',
      payload: { moduleId: 'child_b', name: 'dispatch_scheduler', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(renamed.packageContentByModuleId.child_b.identity?.name).toBe('dispatch_scheduler');
    expect(renamed.moduleList.find((moduleNode) => moduleNode.id === 'child_b')?.name).toBe('dispatch_scheduler');
    expect(renamed.ui.renameDraft).toBe('dispatch_scheduler');
  });

  it('bootstraps mock suggestions for the selected module and generates fresh suggestions for new modules', () => {
    const initialSuggestions = seedState.suggestionsByModuleId.example_uart_rx ?? [];

    expect(initialSuggestions).toHaveLength(4);
    expect(initialSuggestions.map((suggestion) => suggestion.type)).toEqual([
      'purpose_proposal',
      'behavior_summary',
      'ports_suggestion',
      'decomposition_suggestion'
    ]);

    const created = designReducer(seedState, {
      type: 'create_module',
      payload: { name: 'packet_parser', kind: 'leaf', parentModuleId: 'root', nextId: 'packet_parser', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    const createdSuggestions = created.suggestionsByModuleId.packet_parser ?? [];
    expect(createdSuggestions).toHaveLength(4);
    expect(createdSuggestions.every((suggestion) => suggestion.status === 'pending')).toBe(true);
    expect(createdSuggestions[0]?.draft.summaryText).toContain('packet_parser');
  });

  it('supports structured decomposition by creating child modules and packages through the store', () => {
    const selectedRoot = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });
    const decomposed = designReducer(selectedRoot, {
      type: 'decompose_selected_module',
      payload: {
        childNames: ['parser_stage', 'output_stage'],
        childKind: 'leaf',
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    const parserModule = decomposed.moduleList.find((moduleNode) => moduleNode.name === 'parser_stage');
    const outputModule = decomposed.moduleList.find((moduleNode) => moduleNode.name === 'output_stage');

    expect(parserModule).toBeDefined();
    expect(outputModule).toBeDefined();
    expect(decomposed.packageContentByModuleId[parserModule!.id].hierarchy?.parentModuleId).toBe('root');
    expect(decomposed.packageContentByModuleId[outputModule!.id].hierarchy?.parentModuleId).toBe('root');
    expect(decomposed.packageContentByModuleId.root.hierarchy?.childModuleIds).toEqual(
      expect.arrayContaining([parserModule!.id, outputModule!.id])
    );
    expect(decomposed.packageContentByModuleId.root.decompositionStatus?.decompositionStatus).toBe('composite');
    expect(decomposed.moduleList.find((moduleNode) => moduleNode.id === 'root')?.kind).toBe('composite');
    expect(decomposed.ui.currentHierarchyModuleId).toBe('root');
  });

  it('keeps suggestion state module-scoped across selection changes and supports reducer-driven refresh', () => {
    const forRoot = designReducer(seedState, {
      type: 'select_module',
      payload: { moduleId: 'root' }
    });
    const rootSuggestions = forRoot.suggestionsByModuleId.root ?? [];

    expect(rootSuggestions).toHaveLength(4);
    expect(rootSuggestions[0]?.draft.summaryText).toContain('top_controller');

    const backToUart = designReducer(forRoot, {
      type: 'select_module',
      payload: { moduleId: 'example_uart_rx' }
    });
    expect(backToUart.suggestionsByModuleId.example_uart_rx?.[0]?.draft.summaryText).toContain('uart_rx');
    expect(backToUart.suggestionsByModuleId.root?.[0]?.draft.summaryText).toContain('top_controller');

    const refreshedRootSuggestions = rootSuggestions.map((suggestion) => ({
      ...suggestion,
      title: `${suggestion.title} refreshed`
    }));
    const refreshed = designReducer(backToUart, {
      type: 'set_suggestions_for_module',
      payload: { moduleId: 'root', suggestions: refreshedRootSuggestions }
    });

    expect(refreshed.suggestionsByModuleId.root?.every((suggestion) => suggestion.title.endsWith('refreshed'))).toBe(true);
    expect(refreshed.suggestionsByModuleId.example_uart_rx?.[0]?.title).toBe('Purpose proposal');
  });

  it('applies accepted suggestions and marks the accepted card status', () => {
    const suggestion = seedState.suggestionsByModuleId.example_uart_rx?.find((item) => item.type === 'behavior_summary');
    expect(suggestion).toBeDefined();

    const state = designReducer(seedState, {
      type: 'apply_accepted_suggestion',
      payload: {
        moduleId: 'example_uart_rx',
        suggestion: suggestion!,
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(state.packageContentByModuleId.example_uart_rx.behavior?.behaviorSummary).toBe(suggestion?.draft.summaryText);
    expect(state.suggestionsByModuleId.example_uart_rx?.find((item) => item.id === suggestion?.id)?.status).toBe('accepted');
  });

  it('connects modules and records structured dependency links + display entries', () => {
    const state = designReducer(seedState, {
      type: 'connect_modules',
      payload: {
        connection: { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(state.connections[state.connections.length - 1]).toEqual({ fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' });
    expect(state.packageContentByModuleId.child_a.dependencies?.links).toContainEqual({ direction: 'downstream', moduleId: 'child_b', signal: 'fifo_valid' });
    expect(state.packageContentByModuleId.child_b.dependencies?.links).toContainEqual({ direction: 'upstream', moduleId: 'child_a', signal: 'fifo_valid' });
    expect(state.packageContentByModuleId.child_a.dependencies?.relevantDependencies).toContain('downstream:scheduler:fifo_valid');
    expect(state.packageContentByModuleId.child_b.dependencies?.relevantDependencies).toContain('upstream:input_fifo:fifo_valid');
  });

  it('preserves structured dependency links after rename while refreshing display entries', () => {
    const withConnection = designReducer(seedState, {
      type: 'connect_modules',
      payload: {
        connection: { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    const renamed = designReducer(withConnection, {
      type: 'rename_module',
      payload: { moduleId: 'child_b', name: 'dispatch_scheduler', nowIso: '2026-01-01T00:00:01.000Z' }
    });

    expect(renamed.packageContentByModuleId.child_a.dependencies?.links).toContainEqual({ direction: 'downstream', moduleId: 'child_b', signal: 'fifo_valid' });
    expect(renamed.packageContentByModuleId.child_a.dependencies?.relevantDependencies).toContain('downstream:dispatch_scheduler:fifo_valid');
    expect(renamed.packageContentByModuleId.child_a.dependencies?.relevantDependencies).not.toContain('downstream:scheduler:fifo_valid');
  });

  it('updates selected package content', () => {
    const state = designReducer(seedState, {
      type: 'update_selected_module_package',
      payload: {
        updater: (current) => ({ ...current, purpose: { ...current.purpose, summary: 'updated summary' } }),
        nowIso: '2026-01-01T00:00:00.000Z'
      }
    });

    expect(state.packageContentByModuleId.example_uart_rx.purpose?.summary).toBe('updated summary');
  });

  it('moves selected package state forward', () => {
    const state = designReducer(seedState, {
      type: 'move_selected_package_state_forward',
      payload: { to: 'under_review', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.packageContentByModuleId.example_uart_rx.packageStatus).toBe('under_review');
  });

  it('marks the selected module as handed off and records the timestamp', () => {
    const state = designReducer(seedState, {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.packageContentByModuleId.example_uart_rx.packageStatus).toBe('handed_off');
    expect(state.handedOffAtByModuleId.example_uart_rx).toBe('2026-01-01T00:00:00.000Z');
    expect(state.handoffArtifacts[0]).toMatchObject({
      moduleId: 'example_uart_rx',
      moduleName: 'uart_rx',
      targetProviderId: state.ui.selectedProviderId,
      handoffStatus: 'handed_off'
    });
  });
});
