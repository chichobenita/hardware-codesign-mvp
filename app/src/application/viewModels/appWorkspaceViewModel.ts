<<<<<<< HEAD
import { evaluateModuleWorkflowPolicy, summarizeWorkflowIssues } from '../policies/workflowReadinessPolicy';
import { listHandoffProviders } from '../../ai/providers/providerRegistry';
import {
  selectCurrentHierarchyModule,
=======
import { listHandoffProviders } from '../../ai/providers/providerRegistry';
import {
  selectCanShowPayloadPreview,
  selectCurrentHierarchyModule,
  selectDesignHasValidationIssues,
>>>>>>> origin/main
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectGenerationPromptSource,
  selectHandoffArtifactsForModule,
  selectHierarchyBreadcrumbs,
  selectLatestHandoffArtifactForModule,
<<<<<<< HEAD
  selectLatestProviderJobForArtifact,
=======
  selectModuleIsValidForReviewOrHandoff,
>>>>>>> origin/main
  selectParentHierarchyModuleId,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
<<<<<<< HEAD
=======
  selectTransitionReadiness,
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
  const transitionReadiness = selectTransitionReadiness(currentPackageContent);
  const approvedLeafReadyModules = selectEligibleLeafReadyModules(state);
  const canShowPayloadPreview = selectCanShowPayloadPreview(state.ui.workspaceMode, selectedModule, currentPackageContent);
  const validationIssues = selectValidationIssues(state);
  const moduleValidationIssues = selectValidationIssuesForModule(state, state.selectedModuleId);
  const designHasValidationIssues = selectDesignHasValidationIssues(state);
  const isSelectedModuleValidForReviewOrHandoff = selectModuleIsValidForReviewOrHandoff(state, state.selectedModuleId);
  const selectedSuggestions = state.suggestionsByModuleId[state.selectedModuleId] ?? [];
  const hasCurrentSelectedArtifact = latestHandoffArtifact?.handoffStatus === 'handed_off';
  const isSelectedModuleHandoffReady = approvedLeafReadyModules.some((moduleNode) => moduleNode.id === state.selectedModuleId)
    && isSelectedModuleValidForReviewOrHandoff;
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
    transitionReadiness,
    approvedLeafReadyModules,
    canShowPayloadPreview,
    validationIssues,
    moduleValidationIssues,
    designHasValidationIssues,
    isSelectedModuleValidForReviewOrHandoff,
    selectedSuggestions,
>>>>>>> origin/main
    hasCurrentSelectedArtifact,
    isSelectedModuleHandoffReady
  };
}
