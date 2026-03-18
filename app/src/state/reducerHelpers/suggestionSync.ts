import type { ModulePackage } from '../../../../shared/src';
import type { DesignState, ModuleNode, SuggestionCard } from '../../types';

export function createMockSuggestions(moduleNode: ModuleNode, modulePackage: ModulePackage): SuggestionCard[] {
  const moduleName = modulePackage.identity?.name ?? moduleNode.name;
  const hasChildren = (modulePackage.hierarchy?.childModuleIds?.length ?? 0) > 0;

  return [
    {
      id: `${moduleNode.id}-purpose`,
      type: 'purpose_proposal',
      title: 'Purpose proposal',
      description: 'Suggested purpose statement. Accept will update Module Package → Purpose.',
      status: 'pending',
      draft: {
        summaryText: `Coordinate ${moduleName} data flow and expose a stable contract to peer modules.`
      }
    },
    {
      id: `${moduleNode.id}-behavior`,
      type: 'behavior_summary',
      title: 'Behavior summary',
      description: 'Suggested behavior summary. Accept will update Module Package → Behavior summary.',
      status: 'pending',
      draft: {
        summaryText: `On each valid cycle, ${moduleName} consumes inputs, applies internal control rules, and updates outputs deterministically.`
      }
    },
    {
      id: `${moduleNode.id}-ports`,
      type: 'ports_suggestion',
      title: 'Ports suggestion',
      description: 'Suggested interface ports. Accept will replace Module Package → Interfaces ports.',
      status: 'pending',
      draft: {
        ports: [
          { id: `${moduleNode.id}_clk`, name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: `${moduleNode.id}_rst_n`, name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: `${moduleNode.id}_valid_i`, name: 'valid_i', direction: 'input', width: '1', description: 'Input valid handshake' },
          { id: `${moduleNode.id}_ready_o`, name: 'ready_o', direction: 'output', width: '1', description: 'Output ready handshake' }
        ]
      }
    },
    {
      id: `${moduleNode.id}-decomposition`,
      type: 'decomposition_suggestion',
      title: 'Decomposition suggestion',
      description: 'Suggested decomposition status. Accept will update Module Package → Decomposition status.',
      status: 'pending',
      draft: {
        decompositionStatus: hasChildren ? 'composite' : 'candidate_leaf',
        decompositionRationale: hasChildren
          ? `${moduleName} already coordinates sub-modules and should remain composite.`
          : `${moduleName} looks self-contained enough to evaluate as a leaf candidate.`
      }
    }
  ];
}

export function ensureSelectedModuleSuggestions(state: DesignState): DesignState {
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);
  if (!selectedModule || state.suggestionsByModuleId[selectedModule.id]) {
    return state;
  }

  const modulePackage = state.packageContentByModuleId[selectedModule.id];
  if (!modulePackage) {
    return state;
  }

  return {
    ...state,
    suggestionsByModuleId: {
      ...state.suggestionsByModuleId,
      [selectedModule.id]: createMockSuggestions(selectedModule, modulePackage)
    }
  };
}

export function applyAcceptedSuggestion(current: ModulePackage, suggestion: SuggestionCard): ModulePackage {
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
