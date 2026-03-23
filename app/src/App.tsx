import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { AppRibbon } from './components/AppRibbon';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import { SecondaryWorkspaceDock } from './components/SecondaryWorkspaceDock';
import { DesignStoreProvider } from './state/designStore';
import { useAppWorkspace } from './application/useAppWorkspace';

export function AppWorkspace(): JSX.Element {
  const { state, viewModel, actions } = useAppWorkspace();
  const selectedIsComposite = viewModel.selectedModule?.kind === 'composite';

  return (
    <div className="app-shell">
      <AppRibbon
        selectedModule={viewModel.selectedModule}
        currentHierarchyModule={viewModel.currentHierarchyModule}
        workspaceMode={state.ui.workspaceMode}
        setWorkspaceMode={actions.setWorkspaceMode}
        openPackageEditor={() => actions.setWorkspaceMode('design')}
        enterSelectedComposite={actions.enterSelectedComposite}
        navigateToParentHierarchy={actions.navigateToParentHierarchy}
        canNavigateToParent={Boolean(viewModel.parentHierarchyModuleId)}
        canEnterSelectedComposite={selectedIsComposite}
      />

      <main className="workspace-shell">
        <AISuggestionsPanel
          selectedModule={viewModel.selectedModule}
          regenerateProposalsForSelectedModule={actions.regenerateProposalsForSelectedModule}
          selectedProposals={viewModel.selectedProposals}
          updateProposal={actions.updateProposal}
          applyProposal={actions.applyProposal}
          rejectProposal={actions.rejectProposal}
        />

        <section className="workspace-main">
          <div className="workspace-stage-card">
            <div>
              <p className="workspace-stage-kicker">Diagram-first workspace</p>
              <h2>Architecture canvas</h2>
              <p className="muted">The diagram now leads the main screen while secondary work stays in a contextual dock below.</p>
            </div>
            <div className="workspace-stage-meta">
              <span className="workspace-stage-chip">Current scope: {viewModel.currentHierarchyModule?.name ?? 'workspace'}</span>
              <span className="workspace-stage-chip">Selected block: {viewModel.selectedModule?.name ?? 'None'}</span>
            </div>
          </div>

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

          <SecondaryWorkspaceDock
            selectedModule={viewModel.selectedModule}
            currentHierarchyModule={viewModel.currentHierarchyModule}
            workspaceMode={state.ui.workspaceMode}
            openPackageEditor={() => actions.setWorkspaceMode('design')}
            setWorkspaceMode={actions.setWorkspaceMode}
          >
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
          </SecondaryWorkspaceDock>
        </section>
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
