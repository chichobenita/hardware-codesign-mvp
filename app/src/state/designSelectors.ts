import { deriveGenerationPayloadMinimalV1, type GenerationPayloadMinimal, type ModulePackage } from '../../../shared/src';
import { getTransitionReadiness, type TransitionReadiness } from '../packageLifecycle';
import type { DesignState, ModuleNode, PackageSectionStatus, SectionKey, WorkspaceMode } from '../types';

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
