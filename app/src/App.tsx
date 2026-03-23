import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { AppRibbon } from './components/AppRibbon';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { SecondaryWorkspaceSurface } from './components/SecondaryWorkspaceSurface';
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
        activeSecondaryWorkspace={state.ui.secondaryWorkspace}
        openSecondaryWorkspace={actions.setSecondaryWorkspace}
        closeSecondaryWorkspace={() => actions.setSecondaryWorkspace('none')}
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
              <p className="muted">The diagram remains the primary planning surface while deep-work screens open intentionally as focused secondary workspaces.</p>
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
            diagramViewportMode={state.ui.diagramViewportMode}
            setHierarchyView={actions.setHierarchyView}
            setDiagramViewportMode={actions.setDiagramViewportMode}
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

          <SecondaryWorkspaceSurface
            activeWorkspace={state.ui.secondaryWorkspace}
            selectedModule={viewModel.selectedModule}
            state={state}
            currentPackageContent={viewModel.currentPackageContent}
            transitionReadiness={viewModel.transitionReadiness}
            currentSectionStatuses={viewModel.currentSectionStatuses}
            updateCurrentPackage={actions.updateCurrentPackage}
            moduleConnections={viewModel.moduleConnections}
            generatedPayload={viewModel.generatedPayload}
            generatedPrompt={viewModel.generatedPrompt}
            handoffArtifacts={viewModel.handoffArtifacts}
            latestHandoffArtifact={viewModel.latestHandoffArtifact}
            approvedLeafReadyModules={viewModel.approvedLeafReadyModules}
            handoffProviders={viewModel.handoffProviders}
            selectedProviderId={state.ui.selectedProviderId}
            setSelectedProvider={actions.setSelectedProvider}
            currentProviderJob={viewModel.currentProviderJob}
            copyGeneratedPrompt={actions.copyGeneratedPrompt}
            exportGeneratedPrompt={actions.exportGeneratedPrompt}
            exportLatestHandoffArtifact={actions.exportLatestHandoffArtifact}
            exportCurrentProject={actions.exportCurrentProject}
            importProjectFromFile={actions.importProjectFromFile}
            moveToNextPackageState={actions.moveToNextPackageState}
            isSelectedModuleHandoffReady={viewModel.isSelectedModuleHandoffReady}
            hasCurrentSelectedArtifact={viewModel.hasCurrentSelectedArtifact}
            moduleValidationIssues={viewModel.moduleValidationIssues}
            designHasValidationIssues={viewModel.designHasValidationIssues || viewModel.validationIssues.length > 0}
            isSelectedModuleValidForReviewOrHandoff={viewModel.isSelectedModuleValidForReviewOrHandoff}
            currentHierarchyModule={viewModel.currentHierarchyModule}
            currentHierarchyModuleName={viewModel.currentHierarchyModule?.name}
            decompositionDraftNamesText={state.ui.decompositionDraft.namesText}
            decompositionDraftChildKind={state.ui.decompositionDraft.childKind}
            setDecompositionNamesText={actions.setDecompositionNamesText}
            setDecompositionChildKind={actions.setDecompositionChildKind}
            decomposeSelectedModule={actions.decomposeSelectedModule}
            selectModule={actions.selectModule}
            markSelectedModuleAsHandedOff={actions.markSelectedModuleAsHandedOff}
            canShowPayloadPreview={viewModel.canShowPayloadPreview}
            onClose={() => actions.setSecondaryWorkspace('none')}
            onOpenWorkspace={actions.setSecondaryWorkspace}
          />
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
