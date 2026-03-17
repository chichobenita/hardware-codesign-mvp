import { describe, expect, it } from 'vitest';
import { designReducer, seedState } from '../state/designReducer';

describe('designReducer', () => {
  it('creates a module and selects it', () => {
    const state = designReducer(seedState, {
      type: 'create_module',
      payload: { name: 'new_unit', kind: 'leaf', nextId: 'new_unit_1', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.moduleList.some((moduleNode) => moduleNode.id === 'new_unit_1')).toBe(true);
    expect(state.selectedModuleId).toBe('new_unit_1');
    expect(state.packageContentByModuleId.new_unit_1.identity?.name).toBe('new_unit');
  });

  it('renames a module and keeps package identity synchronized as source of truth', () => {
    const state = designReducer(seedState, {
      type: 'rename_module',
      payload: { moduleId: 'child_a', name: 'input_buffer', nowIso: '2026-01-01T00:00:00.000Z' }
    });

    expect(state.moduleList.find((moduleNode) => moduleNode.id === 'child_a')?.name).toBe('input_buffer');
    expect(state.packageContentByModuleId.child_a.identity?.name).toBe('input_buffer');
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
});
