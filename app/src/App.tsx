import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { AppRibbon } from './components/AppRibbon';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { SecondaryWorkspaceSurface } from './components/SecondaryWorkspaceSurface';
import { DesignStoreProvider } from './state/designStore';
import { useAppWorkspace } from './application/useAppWorkspace';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable;
}

export function AppWorkspace(): JSX.Element {
  const { state, viewModel, actions } = useAppWorkspace();
  const selectedIsComposite = viewModel.selectedModule?.kind === 'composite';
  const currentHierarchyRootModuleId = viewModel.currentHierarchyBreadcrumbs[0]?.moduleId;

  const handleWorkspaceKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target) || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      actions.createModuleOfKind('leaf');
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      actions.createModuleOfKind('composite');
      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      actions.addConnection();
      return;
    }

    if (!event.shiftKey && event.key === '1') {
      event.preventDefault();
      actions.setDiagramViewportMode('fit_scope');
      return;
    }

    if (!event.shiftKey && event.key === '2') {
      event.preventDefault();
      actions.setDiagramViewportMode('focus_selection');
      return;
    }

    if (!event.shiftKey && event.key === '3') {
      event.preventDefault();
      actions.setDiagramViewportMode('overview');
      return;
    }

    if (!event.shiftKey && event.key === 'ArrowUp') {
      event.preventDefault();
      actions.navigateToParentHierarchy();
      return;
    }

    if (!event.shiftKey && event.key === 'Enter') {
      event.preventDefault();
      actions.enterSelectedComposite();
    }
  };

  return (
    <div className="app-shell" onKeyDownCapture={handleWorkspaceKeyDownCapture}>
      <AppRibbon
        selectedModule={viewModel.selectedModule}
        currentHierarchyModule={viewModel.currentHierarchyModule}
        currentHierarchyRootModuleId={currentHierarchyRootModuleId}
        activeSecondaryWorkspace={state.ui.secondaryWorkspace}
        visibleModules={viewModel.visibleModules}
        newModuleName={state.ui.newModuleName}
        connectionDraft={state.ui.connectionDraft}
        openSecondaryWorkspace={actions.setSecondaryWorkspace}
        closeSecondaryWorkspace={() => actions.setSecondaryWorkspace('none')}
        setNewModuleName={actions.setNewModuleName}
        createLeafModule={() => actions.createModuleOfKind('leaf')}
        createCompositeModule={() => actions.createModuleOfKind('composite')}
        setConnectionDraft={actions.setConnectionDraft}
        addConnection={actions.addConnection}
        useSelectedModuleAsConnectionSource={actions.useSelectedModuleAsConnectionSource}
        setDiagramViewportMode={actions.setDiagramViewportMode}
        collapseAllEdgeBundles={actions.collapseAllEdgeBundles}
        diagramViewportMode={state.ui.diagramViewportMode}
        enterSelectedComposite={actions.enterSelectedComposite}
        jumpToRootHierarchy={actions.jumpToRootHierarchy}
        navigateToParentHierarchy={actions.navigateToParentHierarchy}
        regenerateProposalsForSelectedModule={actions.regenerateProposalsForSelectedModule}
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
            toggleEdgeBundle={actions.toggleEdgeBundle}
            collapseAllEdgeBundles={actions.collapseAllEdgeBundles}
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
