import type { ModuleNode, ModulePackage } from '../../../../shared/src';
import type { SemanticValidationIssue } from '../../../../shared/src';
import type { TransitionReadiness } from '../../packageLifecycle';
import { getTransitionReadiness } from '../../packageLifecycle';
import type { WorkspaceMode } from '../../types';

export type WorkflowIssueSummary = {
  blockingIssues: SemanticValidationIssue[];
  warningIssues: SemanticValidationIssue[];
  hasBlockingIssues: boolean;
  hasWarnings: boolean;
};

export type ModuleWorkflowPolicy = {
  validation: WorkflowIssueSummary;
  lifecycle: {
    transitionReadiness: TransitionReadiness | null;
  };
  structural: {
    isLeafModule: boolean;
    isApprovedLeaf: boolean;
    isLeafReadyPackage: boolean;
    isStructurallyReadyForReviewOrHandoff: boolean;
  };
  review: {
    isModeActive: boolean;
    isEligible: boolean;
  };
  handoff: {
    isStructurallyReady: boolean;
    isEligible: boolean;
    readinessLabel: 'blocked' | 'ready' | 'ready_with_warnings';
  };
  payloadPreview: {
    isModeActive: boolean;
    canShow: boolean;
  };
};

export function summarizeWorkflowIssues(issues: SemanticValidationIssue[]): WorkflowIssueSummary {
  const blockingIssues = issues.filter((issue) => issue.severity === 'error');
  const warningIssues = issues.filter((issue) => issue.severity === 'warning');

  return {
    blockingIssues,
    warningIssues,
    hasBlockingIssues: blockingIssues.length > 0,
    hasWarnings: warningIssues.length > 0
  };
}

function isLeafReadyPackage(modulePackage: ModulePackage): boolean {
  return modulePackage.packageStatus === 'leaf_ready' || modulePackage.packageStatus === 'handed_off';
}

function isApprovedLeaf(modulePackage: ModulePackage): boolean {
  return modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
}

function isReviewOrHandoffMode(mode: WorkspaceMode): boolean {
  return mode === 'review' || mode === 'handoff';
}

export function evaluateModuleWorkflowPolicy(
  moduleNode: ModuleNode | undefined,
  modulePackage: ModulePackage,
  workspaceMode: WorkspaceMode,
  moduleIssues: SemanticValidationIssue[]
): ModuleWorkflowPolicy {
  const validation = summarizeWorkflowIssues(moduleIssues);
  const structuralIsLeafModule = moduleNode?.kind === 'leaf';
  const structuralIsApprovedLeaf = isApprovedLeaf(modulePackage);
  const structuralIsLeafReadyPackage = isLeafReadyPackage(modulePackage);
  const structurallyReadyForWorkflow = structuralIsLeafModule && structuralIsApprovedLeaf && structuralIsLeafReadyPackage;
  const reviewModeActive = isReviewOrHandoffMode(workspaceMode);
  const isWorkflowEligible = structurallyReadyForWorkflow && !validation.hasBlockingIssues;

  return {
    validation,
    lifecycle: {
      transitionReadiness: getTransitionReadiness(modulePackage)
    },
    structural: {
      isLeafModule: structuralIsLeafModule,
      isApprovedLeaf: structuralIsApprovedLeaf,
      isLeafReadyPackage: structuralIsLeafReadyPackage,
      isStructurallyReadyForReviewOrHandoff: structurallyReadyForWorkflow
    },
    review: {
      isModeActive: reviewModeActive,
      isEligible: reviewModeActive && isWorkflowEligible
    },
    handoff: {
      isStructurallyReady: structurallyReadyForWorkflow,
      isEligible: isWorkflowEligible,
      readinessLabel: validation.hasBlockingIssues
        ? 'blocked'
        : validation.hasWarnings && structurallyReadyForWorkflow
          ? 'ready_with_warnings'
          : 'ready'
    },
    payloadPreview: {
      isModeActive: reviewModeActive,
      canShow: reviewModeActive && isWorkflowEligible
    }
  };
}

export function selectStructurallyReadyHandoffModules(moduleList: ModuleNode[], packageContentByModuleId: Record<string, ModulePackage>): ModuleNode[] {
  return moduleList.filter((moduleNode) => {
    const modulePackage = packageContentByModuleId[moduleNode.id];
    if (!modulePackage) {
      return false;
    }

    return evaluateModuleWorkflowPolicy(moduleNode, modulePackage, 'handoff', []).handoff.isStructurallyReady;
  });
}
