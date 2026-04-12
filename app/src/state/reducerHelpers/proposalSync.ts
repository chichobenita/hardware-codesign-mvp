import type { ModulePackage } from '../../../../shared/src';
import { applyProposalToModulePackage } from '../../ai/proposals/proposalApplication';
import { createMockProposals } from '../../ai/proposals/proposalFactory';
import type { AiProposal } from '../../ai/proposals/proposalTypes';
import type { DesignState } from '../../types';

export function ensureSelectedModuleProposals(state: DesignState): DesignState {
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);
  const existingProposals = selectedModule ? state.proposalsByModuleId[selectedModule.id] : undefined;
  if (!selectedModule || (existingProposals && existingProposals.length > 0)) {
    return state;
  }

  const modulePackage = state.packageContentByModuleId[selectedModule.id];
  if (!modulePackage) {
    return state;
  }

  return {
    ...state,
    proposalsByModuleId: {
      ...state.proposalsByModuleId,
      [selectedModule.id]: createMockProposals(selectedModule, modulePackage)
    }
  };
}

export function applyProposal(current: ModulePackage, proposal: AiProposal): ModulePackage {
  return applyProposalToModulePackage(current, proposal);
}
