import type { ModulePackage } from '../../../../shared/src';
import type { AiProposal, ProposalChange } from './proposalTypes';

export function applyProposalToModulePackage(current: ModulePackage, proposal: AiProposal): ModulePackage {
  const change = proposal.proposedChange;

  if (change.kind === 'purpose_update') {
    return {
      ...current,
      purpose: {
        ...current.purpose,
        summary: change.purposeSummary
      }
    };
  }

  if (change.kind === 'behavior_update') {
    return {
      ...current,
      behavior: {
        ...current.behavior,
        behaviorSummary: change.behaviorSummary
      }
    };
  }

  if (change.kind === 'ports_update') {
    return {
      ...current,
      interfaces: {
        ...current.interfaces,
        ports: change.ports
      }
    };
  }

  return {
    ...current,
    decompositionStatus: {
      decompositionStatus: change.decompositionStatus,
      decompositionRationale: change.decompositionRationale,
      stopReason: current.decompositionStatus?.stopReason,
      stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
      furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
    }
  };
}

export function getProposalTitle(change: ProposalChange): string {
  if (change.kind === 'purpose_update') {
    return 'Purpose proposal';
  }
  if (change.kind === 'behavior_update') {
    return 'Behavior summary';
  }
  if (change.kind === 'ports_update') {
    return 'Ports proposal';
  }
  return 'Decomposition proposal';
}

export function getProposalDescription(change: ProposalChange): string {
  if (change.kind === 'purpose_update') {
    return 'Accept will update Module Package → Purpose.';
  }
  if (change.kind === 'behavior_update') {
    return 'Accept will update Module Package → Behavior summary.';
  }
  if (change.kind === 'ports_update') {
    return 'Accept will replace Module Package → Interface ports.';
  }
  return 'Accept will update Module Package → Decomposition status.';
}
