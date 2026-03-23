import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import { DesignStoreProvider } from './state/designStore';
import { useAppWorkspace } from './application/useAppWorkspace';

export function AppWorkspace(): JSX.Element {
  const { state, viewModel, actions } = useAppWorkspace();

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP — Main Workspace</header>
      <main className="workspace-grid">
        <AISuggestionsPanel
          selectedModule={viewModel.selectedModule}
          regenerateProposalsForSelectedModule={actions.regenerateProposalsForSelectedModule}
          selectedProposals={viewModel.selectedProposals}
          updateProposal={actions.updateProposal}
          applyProposal={actions.applyProposal}
          rejectProposal={actions.rejectProposal}
        />

        <DiagramWorkspace
          state={state}
          visibleModules={viewModel.visibleModules}
          visibleConnections={viewModel.visibleConnections}
          currentHierarchyModule={viewModel.currentHierarchyModule}
          currentHierarchyBreadcrumbs={viewModel.currentHierarchyBreadcrumbs}
          parentHierarchyModuleId={viewModel.parentHierarchyModuleId}
          setHierarchyView={actions.setHierarchyView}
          navigateToParentHierarchy={actions.navigateToParentHierarchy}
          setNewModuleName={actions.setNewModuleName}
          setNewModuleKind={actions.setNewModuleKind}
          createModule={actions.createModule}
          selectModule={actions.selectModule}
          setRenameDraft={actions.setRenameDraft}
          selectedModule={viewModel.selectedModule}
          renameSelectedModule={actions.renameSelectedModule}
          enterSelectedComposite={actions.enterSelectedComposite}
          setConnectionDraft={actions.setConnectionDraft}
          addConnection={actions.addConnection}
        />

        <ModulePackagePanel
          selectedModule={viewModel.selectedModule}
          state={state}
          setWorkspaceMode={actions.setWorkspaceMode}
          handoffProviders={viewModel.handoffProviders}
          selectedProviderId={state.ui.selectedProviderId}
          setSelectedProvider={actions.setSelectedProvider}
          currentPackageContent={viewModel.currentPackageContent}
          transitionReadiness={viewModel.transitionReadiness}
          moveToNextPackageState={actions.moveToNextPackageState}
          currentSectionStatuses={viewModel.currentSectionStatuses}
          updateCurrentPackage={actions.updateCurrentPackage}
          moduleConnections={viewModel.moduleConnections}
          canShowPayloadPreview={viewModel.canShowPayloadPreview}
          generatedPayload={viewModel.generatedPayload}
          generatedPrompt={viewModel.generatedPrompt}
          handoffArtifacts={viewModel.handoffArtifacts}
          latestHandoffArtifact={viewModel.latestHandoffArtifact}
          copyGeneratedPrompt={actions.copyGeneratedPrompt}
          exportGeneratedPrompt={actions.exportGeneratedPrompt}
          exportLatestHandoffArtifact={actions.exportLatestHandoffArtifact}
          approvedLeafReadyModules={viewModel.approvedLeafReadyModules}
          currentProviderJob={viewModel.currentProviderJob}
          selectModule={actions.selectModule}
          markSelectedModuleAsHandedOff={actions.markSelectedModuleAsHandedOff}
          exportCurrentProject={actions.exportCurrentProject}
          importProjectFromFile={actions.importProjectFromFile}
          isSelectedModuleHandoffReady={viewModel.isSelectedModuleHandoffReady}
          hasCurrentSelectedArtifact={viewModel.hasCurrentSelectedArtifact}
          moduleValidationIssues={viewModel.moduleValidationIssues}
          designHasValidationIssues={viewModel.designHasValidationIssues || viewModel.validationIssues.length > 0}
          isSelectedModuleValidForReviewOrHandoff={viewModel.isSelectedModuleValidForReviewOrHandoff}
          currentHierarchyModule={viewModel.currentHierarchyModule}
          decompositionDraftNamesText={state.ui.decompositionDraft.namesText}
          decompositionDraftChildKind={state.ui.decompositionDraft.childKind}
          setDecompositionNamesText={actions.setDecompositionNamesText}
          setDecompositionChildKind={actions.setDecompositionChildKind}
          decomposeSelectedModule={actions.decomposeSelectedModule}
        />
      </main>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <DesignStoreProvider>
      <AppWorkspace />
    </DesignStoreProvider>
  );
}

export default App;
