import { describe, expect, it } from 'vitest';

import { createArtifactConsistencyMarkerFromState, createHandoffArtifactFromState } from '../ai/handoffArtifacts';
import { buildArtifactExportFilename, buildPromptExportFilename, serializeHandoffArtifact, serializePromptExport } from '../ai/handoffExport';
import { mockLocalHdlProvider } from '../ai/providers/mockProvider';
import { createProviderInvocationRequest } from '../ai/providers/providerRequests';
import { DEFAULT_PROVIDER_ID } from '../ai/providers/providerRegistry';
import { selectCanShowPayloadPreview } from '../state/designSelectors';

import { designReducer, seedState } from '../state/designReducer';



describe('handoff artifacts', () => {
  it('creates a handoff artifact from a valid leaf-ready module with payload and prompt snapshots', () => {
    const state = structuredClone(seedState);
    state.selectedModuleId = 'example_uart_rx';
    state.packageContentByModuleId.example_uart_rx = {
      ...state.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready'
    };

    const artifact = createHandoffArtifactFromState(state, 'example_uart_rx', DEFAULT_PROVIDER_ID, '2026-03-18T12:00:00.000Z');

    expect(artifact).not.toBeNull();
    expect(artifact).toMatchObject({
      moduleId: 'example_uart_rx',
      moduleName: 'uart_rx',
      targetProviderId: DEFAULT_PROVIDER_ID,
      handoffStatus: 'handed_off',
      generationPayloadSnapshot: {
        module_name: 'uart_rx'
      }
    });

    expect(artifact?.consistencyMarker).toBe(createArtifactConsistencyMarkerFromState(state, 'example_uart_rx'));
    expect(artifact?.promptSnapshot.promptText).toContain('HDL Generation Prompt v1');
    expect(artifact?.promptSnapshot.promptText).toContain('- Module name: uart_rx');
    expect(artifact?.providerResponse.summary).toContain('uart_rx');
  });

  it('uses the mock provider seam deterministically', () => {
<<<<<<< HEAD
    const result = mockLocalHdlProvider.buildPreparedResult(createProviderInvocationRequest({
=======
    const result = mockLocalHdlProvider.buildResultSnapshot({
>>>>>>> origin/main
      artifactId: 'handoff_test',
      schemaVersion: 'handoff-artifact/v1',
      moduleId: 'example_uart_rx',
      moduleName: 'uart_rx',
      createdAt: '2026-03-18T12:00:00.000Z',
      targetProviderId: mockLocalHdlProvider.id,
      handoffStatus: 'prepared',
      consistencyMarker: 'hf_test',
      generationPayloadSnapshot: {
        module_name: 'uart_rx',
        ports: [],
        purpose: '',
        basic_constraints: [],
        relevant_dependencies: [],
        behavior_rules: [],
        clock_reset_notes: ''
      },
      promptSnapshot: {
        title: 'HDL prompt for uart_rx',
        promptText: 'prompt'
      },
      providerResponse: {
        providerId: mockLocalHdlProvider.id,
        status: 'prepared',
        summary: 'prepared'
      }
    }));

    expect(result).toEqual({
      providerId: mockLocalHdlProvider.id,
      status: 'handed_off',
      summary: 'Mock provider accepted uart_rx locally.'
    });
  });

  it('serializes prompt and handoff artifact exports through pure helpers', () => {
    const promptText = 'HDL Generation Prompt v1\n- Module name: uart_rx';
    const artifactJson = serializeHandoffArtifact({
      artifactId: 'handoff_test',
      schemaVersion: 'handoff-artifact/v1',
      moduleId: 'example_uart_rx',
      moduleName: 'uart_rx',
      createdAt: '2026-03-18T12:00:00.000Z',
      targetProviderId: DEFAULT_PROVIDER_ID,
      handoffStatus: 'handed_off',
      consistencyMarker: 'hf_test',
      generationPayloadSnapshot: {
        module_name: 'uart_rx',
        ports: [],
        purpose: '',
        basic_constraints: [],
        relevant_dependencies: [],
        behavior_rules: [],
        clock_reset_notes: ''
      },
      promptSnapshot: {
        title: 'HDL prompt for uart_rx',
        promptText
      },
      providerResponse: {
        providerId: DEFAULT_PROVIDER_ID,
        status: 'handed_off',
        summary: 'Mock provider accepted uart_rx locally.'
      }
    });

    expect(serializePromptExport(promptText)).toBe(promptText);
    expect(buildPromptExportFilename('uart_rx')).toBe('uart_rx-hdl-prompt.txt');
    expect(buildArtifactExportFilename('uart_rx')).toBe('uart_rx-handoff-artifact.json');
    expect(JSON.parse(artifactJson).promptSnapshot.promptText).toBe(promptText);
  });

  it('marks older artifacts stale after relevant module edits', () => {
    const eligibleState = structuredClone(seedState);
    eligibleState.selectedModuleId = 'example_uart_rx';
    eligibleState.packageContentByModuleId.example_uart_rx = {
      ...eligibleState.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready'
    };

    const handedOffState = designReducer(eligibleState, {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-03-18T12:00:00.000Z' }
    });
    const updatedState = designReducer(handedOffState, {
      type: 'update_selected_module_package',
      payload: {
        updater: (current) => ({
          ...current,
          behavior: {
            ...current.behavior,
            behaviorRules: [...(current.behavior?.behaviorRules ?? []), 'Raise rx_done after byte capture']
          }
        }),
        nowIso: '2026-03-18T12:05:00.000Z'
      }
    });

    expect(updatedState.handoffArtifacts[0]?.handoffStatus).toBe('stale');
  });

  it('does not mark artifacts stale for irrelevant UI-only state changes', () => {
    const eligibleState = structuredClone(seedState);
    eligibleState.selectedModuleId = 'example_uart_rx';
    eligibleState.packageContentByModuleId.example_uart_rx = {
      ...eligibleState.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready'
    };

    const handedOffState = designReducer(eligibleState, {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-03-18T12:00:00.000Z' }
    });
    const uiOnlyChangedState = designReducer(handedOffState, {
      type: 'set_workspace_mode',
      payload: { mode: 'review' }
    });

    expect(uiOnlyChangedState.handoffArtifacts[0]?.handoffStatus).toBe('handed_off');
  });

  it('preserves existing review/handoff gating for payload preview', () => {
    const hidden = selectCanShowPayloadPreview(
      'handoff',
      seedState.moduleList.find((moduleNode) => moduleNode.id === 'example_uart_rx'),
      seedState.packageContentByModuleId.example_uart_rx
    );

    const visible = selectCanShowPayloadPreview(
      'handoff',
      seedState.moduleList.find((moduleNode) => moduleNode.id === 'example_uart_rx'),
      {
        ...seedState.packageContentByModuleId.example_uart_rx,
        packageStatus: 'leaf_ready'
      }
    );

    expect(hidden).toBe(false);
    expect(visible).toBe(true);
  });
});
