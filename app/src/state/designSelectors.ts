import {
  deriveGenerationPayloadMinimalV1,
  type GenerationPayloadMinimal,
  type ModulePackage,
  validateSemanticDesign,
  type SemanticValidationIssue
} from '../../../shared/src';
import { buildHdlGenerationPromptFromState } from '../ai/promptBuilder';
import type { HandoffArtifact } from '../ai/handoffTypes';
import type { ProviderJob } from '../ai/providerJobTypes';
import type { PromptBuildResult } from '../ai/promptTypes';
import { getTransitionReadiness, type TransitionReadiness } from '../packageLifecycle';
import {
  selectCurrentHierarchyModuleFromState,
  selectCurrentHierarchyPackageFromState,
  selectHierarchyBreadcrumbsFromState,
  selectNormalizedHierarchyPackages,
  selectVisibleModulesFromState
} from './hierarchy/hierarchySelectors';
import type { ModuleNode } from '../../../shared/src';
import type {
  Connection,
  DesignState,
  PackageSectionStatus,
  SectionKey,
  WorkspaceMode
} from '../types';

function listStatus(values: string[]): Exclude<PackageSectionStatus, 'needs_review'> {
  if (values.length === 0) {
    return 'empty';
  }

  const filled = values.filter((value) => value.trim().length > 0).length;
  if (filled === 0) {
    return 'empty';
  }
  if (filled === values.length) {
    return 'complete';
  }
  return 'partial';
}

function markNeedsReview(baseStatus: Exclude<PackageSectionStatus, 'needs_review'>, shouldMarkReview: boolean): PackageSectionStatus {
  if (!shouldMarkReview || baseStatus === 'empty') {
    return baseStatus;
  }
  return 'needs_review';
}

export function selectSelectedModule(state: DesignState): ModuleNode | undefined {
  return state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId) ?? state.moduleList[0];
}

export function selectSelectedModulePackage(state: DesignState): ModulePackage {
  return state.packageContentByModuleId[state.selectedModuleId];
}

export function selectCurrentHierarchyModule(state: DesignState): ModuleNode | undefined {
  return selectCurrentHierarchyModuleFromState(state);
}

export function selectCurrentHierarchyPackage(state: DesignState): ModulePackage | undefined {
  return selectCurrentHierarchyPackageFromState(state);
}

export function selectHierarchyBreadcrumbs(state: DesignState) {
  return selectHierarchyBreadcrumbsFromState(state);
}

export function selectVisibleModules(state: DesignState): ModuleNode[] {
  return selectVisibleModulesFromState(state);
}

export function selectVisibleConnections(state: DesignState): Connection[] {
  const visibleIds = new Set(selectVisibleModules(state).map((moduleNode) => moduleNode.id));
  return state.connections.filter((connection) => visibleIds.has(connection.fromModuleId) && visibleIds.has(connection.toModuleId));
}

export function selectIsModuleVisibleInHierarchy(state: DesignState, moduleId: string): boolean {
  return selectVisibleModules(state).some((moduleNode) => moduleNode.id === moduleId);
}

export function selectParentHierarchyModuleId(state: DesignState): string | null {
  const currentHierarchyModule = selectCurrentHierarchyModule(state);
  if (!currentHierarchyModule) {
    return null;
  }

  const parentId = selectNormalizedHierarchyPackages(state)[currentHierarchyModule.id]?.hierarchy?.parentModuleId?.trim();
  return parentId ? parentId : null;
}


export function selectSectionStatuses(modulePackage: ModulePackage): Record<SectionKey, PackageSectionStatus> {
  const reviewMode = modulePackage.packageStatus === 'under_review';

  const interfaceValues = (modulePackage.interfaces?.ports ?? []).flatMap((port) => [port.name ?? '', port.direction ?? '', port.width ?? '']);
  const behaviorValues = [
    modulePackage.behavior?.behaviorSummary ?? '',
    modulePackage.behavior?.operationalDescription ?? '',
    modulePackage.behavior?.clockResetNotes ?? '',
    ...(modulePackage.behavior?.behaviorRules ?? [])
  ];
  const constraintValues = [
    ...(modulePackage.constraints?.timingConstraints ?? []),
    ...(modulePackage.constraints?.latencyConstraints ?? []),
    ...(modulePackage.constraints?.throughputConstraints ?? []),
    ...(modulePackage.constraints?.basicConstraints ?? [])
  ];

  return {
    identity: markNeedsReview(listStatus([modulePackage.identity?.name ?? '', modulePackage.identity?.description ?? '']), reviewMode),
    hierarchy: markNeedsReview(
      listStatus([
        modulePackage.hierarchy?.parentModuleId ?? '',
        ...(modulePackage.hierarchy?.childModuleIds ?? []),
        ...(modulePackage.hierarchy?.hierarchyPath ?? [])
      ]),
      reviewMode
    ),
    interfaces: markNeedsReview(listStatus(interfaceValues), reviewMode),
    purpose: markNeedsReview(listStatus([modulePackage.purpose?.summary ?? '']), reviewMode),
    behavior: markNeedsReview(listStatus(behaviorValues), reviewMode),
    constraints: markNeedsReview(listStatus(constraintValues), reviewMode),
    dependenciesAndInteractions: markNeedsReview(listStatus(modulePackage.dependencies?.relevantDependencies ?? []), reviewMode),
    decompositionStatus: markNeedsReview(
      listStatus([
        modulePackage.decompositionStatus?.decompositionStatus ?? '',
        modulePackage.decompositionStatus?.decompositionRationale ?? '',
        modulePackage.decompositionStatus?.stopReason ?? '',
        modulePackage.decompositionStatus?.furtherDecompositionNotes ?? ''
      ]),
      reviewMode
    )
  };
}

export function selectTransitionReadiness(modulePackage: ModulePackage): TransitionReadiness | null {
  return getTransitionReadiness(modulePackage);
}

export function selectEligibleLeafReadyModules(state: DesignState): ModuleNode[] {
  return state.moduleList.filter((moduleNode) => {
    const modulePackage = state.packageContentByModuleId[moduleNode.id];
    if (!modulePackage) {
      return false;
    }

    const isLeafReadyPackage = modulePackage.packageStatus === 'leaf_ready' || modulePackage.packageStatus === 'handed_off';
    const isApprovedLeaf = modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
    return moduleNode.kind === 'leaf' && isLeafReadyPackage && isApprovedLeaf;
  });
}

export function selectValidationIssues(state: DesignState): SemanticValidationIssue[] {
  return validateSemanticDesign({
    moduleIds: state.moduleList.map((moduleNode) => moduleNode.id),
    packageContentByModuleId: state.packageContentByModuleId,
    connections: state.connections
  });
}

export function selectValidationIssuesForModule(state: DesignState, moduleId: string): SemanticValidationIssue[] {
  return selectValidationIssues(state).filter((issue) => issue.moduleId === moduleId);
}

export function selectModuleHasBlockingValidationErrors(state: DesignState, moduleId: string): boolean {
  return selectValidationIssuesForModule(state, moduleId).some((issue) => issue.severity === 'error');
}

export function selectDesignHasValidationIssues(state: DesignState): boolean {
  return selectValidationIssues(state).length > 0;
}

export function selectModuleIsValidForReviewOrHandoff(state: DesignState, moduleId: string): boolean {
  return !selectModuleHasBlockingValidationErrors(state, moduleId);
}

export function selectCanShowPayloadPreview(mode: WorkspaceMode, selectedModule: ModuleNode | undefined, modulePackage: ModulePackage): boolean {
  const isReviewOrHandoffMode = mode === 'review' || mode === 'handoff';
  const isLeafReadyPackage = modulePackage.packageStatus === 'leaf_ready' || modulePackage.packageStatus === 'handed_off';
  const isApprovedLeaf = modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
  const isLeafModule = selectedModule?.kind === 'leaf';

  return isReviewOrHandoffMode && isLeafReadyPackage && isApprovedLeaf && isLeafModule;
}

export function selectGenerationPayloadSource(modulePackage: ModulePackage): GenerationPayloadMinimal {
  return deriveGenerationPayloadMinimalV1(modulePackage);
}

export function selectGenerationPromptSource(state: DesignState, moduleId: string): PromptBuildResult | null {
  return buildHdlGenerationPromptFromState(state, moduleId);
}

export function selectHandoffArtifactsForModule(state: DesignState, moduleId: string): HandoffArtifact[] {
  return state.handoffArtifacts.filter((artifact) => artifact.moduleId === moduleId);
}

export function selectLatestHandoffArtifactForModule(state: DesignState, moduleId: string): HandoffArtifact | null {
  return selectHandoffArtifactsForModule(state, moduleId)[0] ?? null;
}

export function selectProviderJobsForArtifact(state: DesignState, artifactId: string): ProviderJob[] {
  return state.providerJobs.filter((job) => job.artifactId === artifactId);
}

export function selectLatestProviderJobForArtifact(state: DesignState, artifactId: string): ProviderJob | null {
  return selectProviderJobsForArtifact(state, artifactId)[0] ?? null;
}
