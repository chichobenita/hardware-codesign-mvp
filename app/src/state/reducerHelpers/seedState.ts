import type { ModulePackage } from '../../../../shared/src';
import { DEFAULT_PROVIDER_ID } from '../../ai/providers/providerRegistry';
import type { ModuleNode } from '../../../../shared/src';
import type { Connection, DesignState } from '../../types';

export function nowIso(value?: string): string {
  return value ?? new Date().toISOString();
}

export function sanitizeModuleIdSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'module';
}

export function defaultConnectionDraft(moduleList: ModuleNode[]): Connection {
  return {
    fromModuleId: moduleList[0]?.id ?? '',
    toModuleId: moduleList[1]?.id ?? moduleList[0]?.id ?? '',
    signal: ''
  };
}

export function createModulePackage(nextId: string, cleanName: string, timestamp: string, hierarchy?: {
  parentModuleId?: string;
  hierarchyPath?: string[];
}): ModulePackage {
  return {
    packageId: `pkg_${nextId}`,
    moduleId: nextId,
    packageVersion: '0.1.0',
    packageStatus: 'draft',
    lastUpdatedAt: timestamp,
    lastUpdatedBy: 'mock_user',
    identity: { name: cleanName },
    hierarchy: {
      parentModuleId: hierarchy?.parentModuleId ?? '',
      childModuleIds: [],
      hierarchyPath: hierarchy?.hierarchyPath ?? [cleanName]
    },
    interfaces: { ports: [], interfaceNotes: '' },
    purpose: { summary: '' },
    constraints: { basicConstraints: [] },
    dependencies: { relevantDependencies: [], integrationAssumptions: [], links: [] },
    behavior: { behaviorRules: [], clockResetNotes: '', cornerCases: [], implementationNotes: [] },
    decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
  };
}

export const baseSeedState: DesignState = {
  moduleList: [
    { id: 'root', name: 'top_controller', kind: 'composite' },
    { id: 'child_a', name: 'input_fifo', kind: 'leaf' },
    { id: 'child_b', name: 'scheduler', kind: 'leaf' },
    { id: 'example_uart_rx', name: 'uart_rx', kind: 'leaf' }
  ],
  selectedModuleId: 'example_uart_rx',
  connections: [
    { fromModuleId: 'child_a', toModuleId: 'root', signal: 'fifo_out' },
    { fromModuleId: 'root', toModuleId: 'child_b', signal: 'dispatch_cmd' },
    { fromModuleId: 'example_uart_rx', toModuleId: 'root', signal: 'uart_data_byte' }
  ],
  packageContentByModuleId: {
    root: {
      packageId: 'pkg_root',
      moduleId: 'root',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'top_controller', description: 'Top-level orchestrator for subsystem coordination.' },
      hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b', 'example_uart_rx'], hierarchyPath: ['top_controller'] },
      interfaces: {
        ports: [{ id: 'cfg_bus', name: 'cfg_bus', direction: 'input', width: '32' }, { id: 'data_out', name: 'data_out', direction: 'output', width: '32' }],
        interfaceNotes: 'cfg_bus is sampled by the control path and data_out drives the top-level response path.'
      },
      purpose: { summary: 'Coordinates data flow and control decisions.' },
      decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: 'Still splitting control and data scheduling.', furtherDecompositionNotes: 'Need one more refinement pass.' }
    },
    child_a: {
      packageId: 'pkg_child_a',
      moduleId: 'child_a',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'input_fifo' },
      hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'input_fifo'] },
      interfaces: {
        ports: [{ id: 'data_in', name: 'data_in', direction: 'input' }, { id: 'fifo_out', name: 'fifo_out', direction: 'output' }],
        interfaceNotes: ''
      },
      purpose: { summary: '' }
    },
    child_b: {
      packageId: 'pkg_child_b',
      moduleId: 'child_b',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'scheduler' },
      hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'scheduler'] },
      interfaces: { ports: [], interfaceNotes: '' },
      purpose: { summary: '' }
    },
    example_uart_rx: {
      packageId: 'pkg_example_uart_rx',
      moduleId: 'example_uart_rx',
      packageVersion: '0.1.0',
      packageStatus: 'partially_defined',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'uart_rx', description: 'UART receiver converting serial stream to bytes.' },
      hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'uart_rx'] },
      interfaces: {
        ports: [
          { id: 'clk', name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: 'rst_n', name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: 'rx_i', name: 'rx_i', direction: 'input', width: '1', description: 'UART serial input' },
          { id: 'data_o', name: 'data_o', direction: 'output', width: '8', description: 'Received byte' }
        ],
        interfaceNotes: 'clk and rst_n are shared system signals; data_o is emitted once a full frame is decoded.'
      },
      purpose: { summary: 'Receives UART serial data and emits decoded bytes.' },
      constraints: { basicConstraints: ['115200 baud nominal', '8-N-1 format'] },
      dependencies: {
        relevantDependencies: ['system clock', 'upstream UART TX timing assumptions'],
        integrationAssumptions: ['Upstream serial source follows nominal 8-N-1 framing', 'Top-level logic samples data_o after the receive-complete condition'],
        links: []
      },
      behavior: {
        behaviorSummary: 'Detect start bit, sample 8 data bits, emit output byte.',
        behaviorRules: ['Sample start bit midpoint before data bits', 'Assert data_o only after a full valid frame'],
        clockResetNotes: 'Synchronous to clk. rst_n clears RX state machine and output valid flags.',
        cornerCases: ['Ignore frames with invalid stop bit', 'Return to idle cleanly after reset during an active frame'],
        implementationNotes: ['Use a baud-rate counter derived from clk', 'Keep RX state transitions simple and single-clocked']
      },
      decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'Simple block with clear fixed behavior.', stopRecommendedBy: 'system' }
    }
  },
  handedOffAtByModuleId: {},
  handoffArtifacts: [],
  providerJobs: [],
  proposalsByModuleId: {},
  ui: {
    workspaceMode: 'design',
    selectedProviderId: DEFAULT_PROVIDER_ID,
    currentHierarchyModuleId: 'root',
    newModuleName: '',
    newModuleKind: 'leaf',
    renameDraft: '',
    connectionDraft: { fromModuleId: '', toModuleId: '', signal: '' },
    decompositionDraft: {
      namesText: '',
      childKind: 'leaf'
    },
    projectImportError: null
  }
};
