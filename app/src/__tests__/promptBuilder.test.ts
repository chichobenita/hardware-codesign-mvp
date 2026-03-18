import { describe, expect, it } from 'vitest';
import type { ModulePackage } from '../../../shared/src';
import { importDesignState, PERSISTED_DESIGN_SCHEMA_VERSION } from '../state/designPersistence';
import { seedState } from '../state/designReducer';
import { buildHdlGenerationPrompt, buildHdlGenerationPromptFromState, createPromptBuildInput } from '../ai/promptBuilder';
import type { PromptBuildInput } from '../ai/promptTypes';

function createLeafReadyPackage(): ModulePackage {
  return {
    packageId: 'pkg_uart_rx',
    moduleId: 'uart_rx',
    packageVersion: '0.1.0',
    packageStatus: 'leaf_ready',
    lastUpdatedAt: '2026-03-18T00:00:00.000Z',
    lastUpdatedBy: 'tester',
    identity: {
      name: 'uart_rx',
      description: 'UART receiver converting serial input into bytes.'
    },
    hierarchy: {
      parentModuleId: 'root',
      childModuleIds: [],
      hierarchyPath: ['top_controller', 'uart_rx']
    },
    interfaces: {
      ports: [
        { id: 'clk', name: 'clk', direction: 'input', width: '1', description: 'System clock' },
        { id: 'rst_n', name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
        { id: 'rx_i', name: 'rx_i', direction: 'input', width: '1', description: 'Serial input' },
        { id: 'data_o', name: 'data_o', direction: 'output', width: '8', description: 'Decoded byte output' }
      ]
    },
    purpose: {
      summary: 'Receive UART serial frames and emit decoded bytes.'
    },
    constraints: {
      basicConstraints: ['115200 baud nominal', '8-N-1 framing']
    },
    dependencies: {
      relevantDependencies: ['upstream:uart_tx:rx_i', 'system clock']
    },
    behavior: {
      behaviorSummary: 'Samples the incoming line and emits a byte after a valid frame.',
      operationalDescription: 'Uses a baud counter to sample start, data, and stop bits.',
      behaviorRules: ['Detect a valid start bit before sampling data bits', 'Emit one byte only after a complete valid frame'],
      clockResetNotes: 'Synchronous to clk. rst_n clears the receive state machine.'
    },
    decompositionStatus: {
      decompositionStatus: 'approved_leaf',
      decompositionRationale: 'Bounded single-purpose implementation block.'
    }
  };
}

describe('promptBuilder', () => {
  it('generates a structured prompt for a valid leaf-ready module', () => {
    const packageContent = createLeafReadyPackage();
    const input: PromptBuildInput = {
      moduleId: packageContent.moduleId,
      moduleName: packageContent.identity?.name ?? 'uart_rx',
      moduleDescription: packageContent.identity?.description ?? '',
      purposeSummary: packageContent.purpose?.summary ?? '',
      behaviorSummary: packageContent.behavior?.behaviorSummary ?? '',
      operationalDescription: packageContent.behavior?.operationalDescription ?? '',
      payload: {
        module_name: 'uart_rx',
        ports: packageContent.interfaces?.ports ?? [],
        purpose: packageContent.purpose?.summary ?? '',
        basic_constraints: packageContent.constraints?.basicConstraints ?? [],
        relevant_dependencies: packageContent.dependencies?.relevantDependencies ?? [],
        behavior_rules: packageContent.behavior?.behaviorRules ?? [],
        clock_reset_notes: packageContent.behavior?.clockResetNotes ?? ''
      },
      hierarchyContext: {
        parentModuleName: 'top_controller',
        hierarchyPath: ['top_controller', 'uart_rx'],
        roleSummary: 'Leaf implementation unit under top_controller.',
        moduleKind: 'leaf'
      }
    };

    const result = buildHdlGenerationPrompt(input);

    expect(result.title).toBe('HDL prompt for uart_rx');
    expect(result.promptText).toContain('HDL Generation Prompt v1');
    expect(result.promptText).toContain('Target module');
    expect(result.promptText).toContain('- Module name: uart_rx');
    expect(result.promptText).toContain('Hierarchy context');
    expect(result.promptText).toContain('- Parent module: top_controller');
    expect(result.promptText).toContain('- input clk [1] — System clock');
  });

  it('is deterministic for the same normalized input', () => {
    const state = structuredClone(seedState);
    const packageContent = createLeafReadyPackage();
    state.packageContentByModuleId.example_uart_rx = packageContent;
    state.moduleList = state.moduleList.map((moduleNode) => (
      moduleNode.id === 'example_uart_rx'
        ? { ...moduleNode, name: 'uart_rx', kind: 'leaf' }
        : moduleNode
    ));

    const first = buildHdlGenerationPromptFromState(state, 'example_uart_rx');
    const second = buildHdlGenerationPromptFromState(state, 'example_uart_rx');

    expect(first).toEqual(second);
  });

  it('includes required generation payload fields in the final prompt', () => {
    const state = structuredClone(seedState);
    state.packageContentByModuleId.example_uart_rx = createLeafReadyPackage();

    const result = buildHdlGenerationPromptFromState(state, 'example_uart_rx');

    expect(result?.promptText).toContain('Ports');
    expect(result?.promptText).toContain('Behavior rules');
    expect(result?.promptText).toContain('Basic constraints');
    expect(result?.promptText).toContain('Relevant dependencies');
    expect(result?.promptText).toContain('Clock and reset notes');
    expect(result?.promptText).toContain('115200 baud nominal');
    expect(result?.promptText).toContain('upstream:uart_tx:rx_i');
  });

  it('preserves dependencies and clock/reset notes in prompt output', () => {
    const state = structuredClone(seedState);
    state.packageContentByModuleId.example_uart_rx = createLeafReadyPackage();

    const input = createPromptBuildInput(state, 'example_uart_rx');
    const result = input ? buildHdlGenerationPrompt(input) : null;

    expect(result?.promptText).toContain('Synchronous to clk. rst_n clears the receive state machine.');
    expect(result?.promptText).toContain('system clock');
    expect(result?.promptText).toContain('Emit one byte only after a complete valid frame');
  });

  it('remains compatible after restore/import of state', () => {
    const state = structuredClone(seedState);
    state.packageContentByModuleId.example_uart_rx = createLeafReadyPackage();
    state.moduleList = state.moduleList.map((moduleNode) => (
      moduleNode.id === 'example_uart_rx' ? { ...moduleNode, name: 'legacy_name', kind: 'leaf' } : moduleNode
    ));

    const snapshot = JSON.stringify({
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: state.moduleList,
      selectedModuleId: state.selectedModuleId,
      connections: state.connections,
      packageContentByModuleId: state.packageContentByModuleId,
      handedOffAtByModuleId: state.handedOffAtByModuleId,
      handoffArtifacts: state.handoffArtifacts
    });

    const imported = importDesignState(snapshot);
    expect(imported.ok).toBe(true);

    const restoredPrompt = imported.ok && imported.state
      ? buildHdlGenerationPromptFromState(imported.state, 'example_uart_rx')
      : null;
    const reimported = imported.ok && imported.state ? importDesignState(JSON.stringify({
      schemaVersion: PERSISTED_DESIGN_SCHEMA_VERSION,
      moduleList: imported.state.moduleList,
      selectedModuleId: imported.state.selectedModuleId,
      connections: imported.state.connections,
      packageContentByModuleId: imported.state.packageContentByModuleId,
      handedOffAtByModuleId: imported.state.handedOffAtByModuleId,
      handoffArtifacts: imported.state.handoffArtifacts
    })) : null;
    const reimportedPrompt = reimported && reimported.ok && reimported.state
      ? buildHdlGenerationPromptFromState(reimported.state, 'example_uart_rx')
      : null;

    expect(reimportedPrompt).toEqual(restoredPrompt);
    expect(restoredPrompt?.promptText).toContain('- Module name: uart_rx');
    expect(restoredPrompt?.promptText).toContain('downstream:top_controller:uart_data_byte');
  });
});
