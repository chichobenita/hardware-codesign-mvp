import type { ModulePackage } from '../../../shared/src';
import type { Connection, DesignState, ModuleNode, SuggestionCard } from '../types';
import type { DesignAction } from './designActions';

function nowIso(value?: string): string {
  return value ?? new Date().toISOString();
}

function dependencyEntry(kind: 'upstream' | 'downstream', moduleName: string, signal: string): string {
  const cleanSignal = signal.trim();
  return cleanSignal.length > 0 ? `${kind}:${moduleName}:${cleanSignal}` : `${kind}:${moduleName}`;
}

function withConnectionDependencies(current: DesignState, connection: Connection, timestamp: string): DesignState {
  const sourcePackage = current.packageContentByModuleId[connection.fromModuleId];
  const targetPackage = current.packageContentByModuleId[connection.toModuleId];

  if (!sourcePackage || !targetPackage) {
    return current;
  }

  const sourceName = sourcePackage.identity?.name ?? connection.fromModuleId;
  const targetName = targetPackage.identity?.name ?? connection.toModuleId;

  const sourceDependencies = sourcePackage.dependencies?.relevantDependencies ?? [];
  const targetDependencies = targetPackage.dependencies?.relevantDependencies ?? [];
  const downstreamItem = dependencyEntry('downstream', targetName, connection.signal);
  const upstreamItem = dependencyEntry('upstream', sourceName, connection.signal);

  return {
    ...current,
    packageContentByModuleId: {
      ...current.packageContentByModuleId,
      [connection.fromModuleId]: {
        ...sourcePackage,
        lastUpdatedAt: timestamp,
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...sourcePackage.dependencies,
          relevantDependencies: sourceDependencies.includes(downstreamItem)
            ? sourceDependencies
            : [...sourceDependencies, downstreamItem]
        }
      },
      [connection.toModuleId]: {
        ...targetPackage,
        lastUpdatedAt: timestamp,
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...targetPackage.dependencies,
          relevantDependencies: targetDependencies.includes(upstreamItem)
            ? targetDependencies
            : [...targetDependencies, upstreamItem]
        }
      }
    }
  };
}

function applyModulePackageUpdate(state: DesignState, moduleId: string, updater: (current: ModulePackage) => ModulePackage, timestamp: string): DesignState {
  const currentPackage = state.packageContentByModuleId[moduleId];
  if (!currentPackage) {
    return state;
  }

  const nextPackage = {
    ...updater(currentPackage),
    moduleId,
    lastUpdatedAt: timestamp,
    lastUpdatedBy: 'mock_user'
  };

  return {
    ...state,
    packageContentByModuleId: {
      ...state.packageContentByModuleId,
      [moduleId]: nextPackage
    },
    moduleList: state.moduleList.map((moduleNode) =>
      moduleNode.id === moduleId ? { ...moduleNode, name: nextPackage.identity?.name || 'unnamed_module' } : moduleNode
    )
  };
}

function applyAcceptedSuggestion(current: ModulePackage, suggestion: SuggestionCard): ModulePackage {
  if (suggestion.type === 'purpose_proposal') {
    return {
      ...current,
      purpose: {
        ...current.purpose,
        summary: suggestion.draft.summaryText ?? ''
      }
    };
  }

  if (suggestion.type === 'behavior_summary') {
    return {
      ...current,
      behavior: {
        ...current.behavior,
        behaviorSummary: suggestion.draft.summaryText ?? ''
      }
    };
  }

  if (suggestion.type === 'ports_suggestion') {
    return {
      ...current,
      interfaces: {
        ...current.interfaces,
        ports: suggestion.draft.ports ?? []
      }
    };
  }

  return {
    ...current,
    decompositionStatus: {
      decompositionStatus: suggestion.draft.decompositionStatus ?? 'under_decomposition',
      decompositionRationale: suggestion.draft.decompositionRationale ?? '',
      stopReason: current.decompositionStatus?.stopReason,
      stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
      furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
    }
  };
}

export const seedState: DesignState = {
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
      hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b'], hierarchyPath: ['top_controller'] },
      interfaces: { ports: [{ id: 'cfg_bus', name: 'cfg_bus', direction: 'input', width: '32' }, { id: 'data_out', name: 'data_out', direction: 'output', width: '32' }] },
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
      interfaces: { ports: [{ id: 'data_in', name: 'data_in', direction: 'input' }, { id: 'fifo_out', name: 'fifo_out', direction: 'output' }] },
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
      interfaces: { ports: [] },
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
        ]
      },
      purpose: { summary: 'Receives UART serial data and emits decoded bytes.' },
      constraints: { basicConstraints: ['115200 baud nominal', '8-N-1 format'] },
      dependencies: { relevantDependencies: ['system clock', 'upstream UART TX timing assumptions'] },
      behavior: {
        behaviorSummary: 'Detect start bit, sample 8 data bits, emit output byte.',
        behaviorRules: ['Sample start bit midpoint before data bits', 'Assert data_o only after a full valid frame'],
        clockResetNotes: 'Synchronous to clk. rst_n clears RX state machine and output valid flags.'
      },
      decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'Simple block with clear fixed behavior.', stopRecommendedBy: 'system' }
    }
  },
  handedOffAtByModuleId: {},
  suggestionsByModuleId: {}
};

function createModulePackage(nextId: string, cleanName: string, timestamp: string): ModulePackage {
  return {
    packageId: `pkg_${nextId}`,
    moduleId: nextId,
    packageVersion: '0.1.0',
    packageStatus: 'draft',
    lastUpdatedAt: timestamp,
    lastUpdatedBy: 'mock_user',
    identity: { name: cleanName },
    hierarchy: { parentModuleId: '', childModuleIds: [], hierarchyPath: [cleanName] },
    interfaces: { ports: [] },
    purpose: { summary: '' },
    constraints: { basicConstraints: [] },
    dependencies: { relevantDependencies: [] },
    behavior: { behaviorRules: [], clockResetNotes: '' },
    decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
  };
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case 'create_module': {
      const cleanName = action.payload.name.trim() || 'unnamed_module';
      const timestamp = nowIso(action.payload.nowIso);
      const nextId = action.payload.nextId ?? `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
      const newPackage = createModulePackage(nextId, cleanName, timestamp);

      return {
        ...state,
        moduleList: [...state.moduleList, { id: nextId, name: cleanName, kind: action.payload.kind }],
        selectedModuleId: nextId,
        packageContentByModuleId: { ...state.packageContentByModuleId, [nextId]: newPackage }
      };
    }
    case 'rename_module': {
      const cleanName = action.payload.name.trim();
      if (!cleanName) {
        return state;
      }

      return applyModulePackageUpdate(
        state,
        action.payload.moduleId,
        (current) => ({ ...current, identity: { ...current.identity, name: cleanName } }),
        nowIso(action.payload.nowIso)
      );
    }
    case 'select_module':
      return { ...state, selectedModuleId: action.payload.moduleId };
    case 'connect_modules': {
      const timestamp = nowIso(action.payload.nowIso);
      const withConnection = {
        ...state,
        connections: [...state.connections, action.payload.connection]
      };
      return withConnectionDependencies(withConnection, action.payload.connection, timestamp);
    }
    case 'update_selected_module_package':
      return applyModulePackageUpdate(state, state.selectedModuleId, action.payload.updater, nowIso(action.payload.nowIso));
    case 'update_module_package':
      return applyModulePackageUpdate(state, action.payload.moduleId, action.payload.updater, nowIso(action.payload.nowIso));
    case 'apply_accepted_suggestion': {
      const withPackageUpdate = applyModulePackageUpdate(
        state,
        action.payload.moduleId,
        (current) => applyAcceptedSuggestion(current, action.payload.suggestion),
        nowIso(action.payload.nowIso)
      );
      const suggestions = withPackageUpdate.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...withPackageUpdate,
        suggestionsByModuleId: {
          ...withPackageUpdate.suggestionsByModuleId,
          [action.payload.moduleId]: suggestions.map((item) =>
            item.id === action.payload.suggestion.id ? { ...item, status: 'accepted' } : item
          )
        }
      };
    }
    case 'update_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.map((suggestion) =>
            suggestion.id === action.payload.suggestionId ? action.payload.updater(suggestion) : suggestion
          )
        }
      };
    }
    case 'reject_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.map((suggestion) =>
            suggestion.id === action.payload.suggestionId ? { ...suggestion, status: 'rejected' } : suggestion
          )
        }
      };
    }
    case 'set_suggestions_for_module':
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: action.payload.suggestions
        }
      };
    case 'remove_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.filter((suggestion) => suggestion.id !== action.payload.suggestionId)
        }
      };
    }
    case 'move_selected_package_state_forward':
      return applyModulePackageUpdate(
        state,
        state.selectedModuleId,
        (current) => ({ ...current, packageStatus: action.payload.to }),
        nowIso(action.payload.nowIso)
      );
    case 'mark_selected_module_handed_off': {
      const timestamp = nowIso(action.payload.nowIso);
      const withPackageUpdate = applyModulePackageUpdate(
        state,
        state.selectedModuleId,
        (current) => ({ ...current, packageStatus: 'handed_off' }),
        timestamp
      );
      return {
        ...withPackageUpdate,
        handedOffAtByModuleId: {
          ...withPackageUpdate.handedOffAtByModuleId,
          [state.selectedModuleId]: timestamp
        }
      };
    }
    case 'load_persisted_design_state':
      return action.payload.state;
    case 'replace_design_state':
      return action.payload.state;
    default:
      return state;
  }
}

export function defaultConnectionDraft(moduleList: ModuleNode[]): Connection {
  return {
    fromModuleId: moduleList[0]?.id ?? '',
    toModuleId: moduleList[1]?.id ?? moduleList[0]?.id ?? '',
    signal: ''
  };
}
