import { describe, expect, it } from 'vitest';
import { deriveGenerationPayloadMinimalV1 } from '../../../shared/src';
import { createArtifactConsistencyMarkerFromState } from '../ai/handoffArtifacts';
import { buildHdlGenerationPromptFromState } from '../ai/promptBuilder';
import { seedState } from '../state/designReducer';
import { importDesignState, serializeDesignSnapshot } from '../state/designPersistence';

describe('persistence contract invariants', () => {
  it('preserves payload, prompt, and artifact consistency derivation across persist/import roundtrips', () => {
    const state = structuredClone(seedState);
    state.selectedModuleId = 'example_uart_rx';
    state.packageContentByModuleId.example_uart_rx = {
      ...state.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready'
    };

    const beforePayload = deriveGenerationPayloadMinimalV1(state.packageContentByModuleId.example_uart_rx);
    const beforePrompt = buildHdlGenerationPromptFromState(state, 'example_uart_rx');
    const beforeMarker = createArtifactConsistencyMarkerFromState(state, 'example_uart_rx');

    const imported = importDesignState(serializeDesignSnapshot(state));
    expect(imported.ok).toBe(true);
    expect(imported.state).toBeDefined();

    const restoredState = imported.ok && imported.state ? imported.state : null;
    const afterPayload = restoredState ? deriveGenerationPayloadMinimalV1(restoredState.packageContentByModuleId.example_uart_rx) : null;
    const afterPrompt = restoredState ? buildHdlGenerationPromptFromState(restoredState, 'example_uart_rx') : null;
    const afterMarker = restoredState ? createArtifactConsistencyMarkerFromState(restoredState, 'example_uart_rx') : null;

    expect(afterPayload).toEqual(beforePayload);
    expect(afterPrompt).toEqual(beforePrompt);
    expect(afterMarker).toBe(beforeMarker);
  });

  it('fails in a controlled way for malformed legacy snapshots that cannot be restored', () => {
    const imported = importDesignState(JSON.stringify({
      schemaVersion: 1,
      moduleList: [{ id: 'orphan', name: 'orphan', kind: 'leaf' }],
      selectedModuleId: 'missing_module',
      connections: [],
      packageContentByModuleId: {}
    }));

    expect(imported).toEqual({ ok: false, reason: 'invalid_restore_state' });
  });
});
