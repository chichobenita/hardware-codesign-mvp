import { evaluateModuleWorkflowPolicy, summarizeWorkflowIssues } from '../policies/workflowReadinessPolicy';
import { listHandoffProviders } from '../../ai/providers/providerRegistry';
import {
  selectCurrentHierarchyModule,
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectGenerationPromptSource,
  selectHandoffArtifactsForModule,
  selectHierarchyBreadcrumbs,
  selectLatestHandoffArtifactForModule,
  selectLatestProviderJobForArtifact,
  selectParentHierarchyModuleId,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
  selectValidationIssues,
  selectValidationIssuesForModule,
  selectVisibleConnections,
  selectVisibleModules
} from '../../state/designSelectors';
import type { DesignState } from '../../types';

export type AppWorkspaceViewModel = ReturnType<typeof buildAppWorkspaceViewModel>;

export function buildAppWorkspaceViewModel(state: DesignState) {
  const selectedModule = selectSelectedModule(state);
  const currentHierarchyModule = selectCurrentHierarchyModule(state);
  const currentHierarchyBreadcrumbs = selectHierarchyBreadcrumbs(state);
  const parentHierarchyModuleId = selectParentHierarchyModuleId(state);
  const visibleModules = selectVisibleModules(state);
  const visibleConnections = selectVisibleConnections(state);
  const currentPackageContent = selectSelectedModulePackage(state);
  const currentSectionStatuses = selectSectionStatuses(currentPackageContent);
  const moduleConnections = state.connections.filter((connection) => (
    connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId
  ));
  const generatedPayload = selectGenerationPayloadSource(currentPackageContent);
  const generatedPrompt = selectGenerationPromptSource(state, state.selectedModuleId);
  const handoffArtifacts = selectHandoffArtifactsForModule(state, state.selectedModuleId);
  const latestHandoffArtifact = selectLatestHandoffArtifactForModule(state, state.selectedModuleId);
  const handoffProviders = listHandoffProviders();
  const approvedLeafReadyModules = selectEligibleLeafReadyModules(state);
  const validationIssues = selectValidationIssues(state);
  const moduleValidationIssues = selectValidationIssuesForModule(state, state.selectedModuleId);
  const designIssueSummary = summarizeWorkflowIssues(validationIssues);
  const moduleWorkflowPolicy = evaluateModuleWorkflowPolicy(
    selectedModule,
    currentPackageContent,
    state.ui.workspaceMode,
    moduleValidationIssues
  );
  const selectedProposals = state.proposalsByModuleId[state.selectedModuleId] ?? [];
  const currentProviderJob = latestHandoffArtifact ? selectLatestProviderJobForArtifact(state, latestHandoffArtifact.artifactId) : null;
  const hasCurrentSelectedArtifact = latestHandoffArtifact?.handoffStatus === 'handed_off';
  const isSelectedModuleHandoffReady = moduleWorkflowPolicy.handoff.isEligible;

  return {
    selectedModule,
    currentHierarchyModule,
    currentHierarchyBreadcrumbs,
    parentHierarchyModuleId,
    visibleModules,
    visibleConnections,
    currentPackageContent,
    currentSectionStatuses,
    moduleConnections,
    generatedPayload,
    generatedPrompt,
    handoffArtifacts,
    latestHandoffArtifact,
    handoffProviders,
    workflowPolicy: moduleWorkflowPolicy,
    transitionReadiness: moduleWorkflowPolicy.lifecycle.transitionReadiness,
    approvedLeafReadyModules,
    canShowPayloadPreview: moduleWorkflowPolicy.payloadPreview.canShow,
    validationIssues,
    moduleValidationIssues,
    designHasValidationIssues: designIssueSummary.hasBlockingIssues || designIssueSummary.hasWarnings,
    designIssueSummary,
    isSelectedModuleValidForReviewOrHandoff: moduleWorkflowPolicy.review.isEligible,
    selectedProposals,
    currentProviderJob,
    hasCurrentSelectedArtifact,
    isSelectedModuleHandoffReady
  };
}
