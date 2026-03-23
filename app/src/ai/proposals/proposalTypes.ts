import type { ModulePackage, ModulePort } from '../../../../shared/src';

export type ProposalSource = {
  kind: 'mock_local';
  label: string;
};

export type ProposalStatus = 'proposed' | 'rejected' | 'applied';

export type ProposalChange =
  | {
      kind: 'purpose_update';
      purposeSummary: string;
    }
  | {
      kind: 'behavior_update';
      behaviorSummary: string;
    }
  | {
      kind: 'ports_update';
      ports: ModulePort[];
    }
  | {
      kind: 'decomposition_update';
      decompositionStatus: NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'];
      decompositionRationale: string;
    };

export type AiProposal = {
  proposalId: string;
  source: ProposalSource;
  target: {
    moduleId: string;
    scope: 'module_package';
  };
  status: ProposalStatus;
  rationale: string;
  proposedChange: ProposalChange;
};
