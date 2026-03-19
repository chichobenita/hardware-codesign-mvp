import { listHandoffProviders } from '../../ai/providers/providerRegistry';
import {
  selectCanShowPayloadPreview,
  selectCurrentHierarchyModule,
  selectDesignHasValidationIssues,
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectGenerationPromptSource,
  selectHandoffArtifactsForModule,
  selectHierarchyBreadcrumbs,
  selectLatestHandoffArtifactForModule,
  selectModuleIsValidForReviewOrHandoff,
  selectParentHierarchyModuleId,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
  selectTransitionReadiness,
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
    transitionReadiness,
    approvedLeafReadyModules,
    canShowPayloadPreview,
    validationIssues,
    moduleValidationIssues,
    designHasValidationIssues,
    isSelectedModuleValidForReviewOrHandoff,
    selectedSuggestions,
    hasCurrentSelectedArtifact,
    isSelectedModuleHandoffReady
  };
}
