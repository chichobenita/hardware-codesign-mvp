import { describe, expect, it } from 'vitest';
import { createHandoffArtifactFromState } from '../ai/handoffArtifacts';
import { buildArtifactExportFilename, buildPromptExportFilename, serializeHandoffArtifact, serializePromptExport } from '../ai/handoffExport';
import { mockLocalHdlProvider } from '../ai/providers/mockProvider';
import { DEFAULT_PROVIDER_ID } from '../ai/providers/providerRegistry';
import { selectCanShowPayloadPreview } from '../state/designSelectors';
import { seedState } from '../state/designReducer';

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
    expect(artifact?.promptSnapshot.promptText).toContain('HDL Generation Prompt v1');
    expect(artifact?.promptSnapshot.promptText).toContain('- Module name: uart_rx');
    expect(artifact?.providerResponse.summary).toContain('uart_rx');
  });

  it('uses the mock provider seam deterministically', () => {
    const result = mockLocalHdlProvider.handoffArtifact({
      artifactId: 'handoff_test',
      schemaVersion: 'handoff-artifact/v1',
      moduleId: 'example_uart_rx',
      moduleName: 'uart_rx',
      createdAt: '2026-03-18T12:00:00.000Z',
      targetProviderId: mockLocalHdlProvider.id,
      handoffStatus: 'created',
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
        status: 'created',
        summary: 'prepared'
      }
    });

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
