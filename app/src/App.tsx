import type { ModulePackage } from '../../shared/src';
import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import { DesignStoreProvider, useDesignStore } from './state/designStore';
import { exportProjectSnapshot, getProjectImportErrorMessage, importProjectSnapshot, triggerProjectDownload } from './state/designTransfer';
import {
  selectCanShowPayloadPreview,
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
  selectTransitionReadiness,
  selectValidationIssues,
  selectValidationIssuesForModule,
  selectDesignHasValidationIssues,
  selectModuleIsValidForReviewOrHandoff
} from './state/designSelectors';
import type { SuggestionCard } from './types';

function AppWorkspace(): JSX.Element {
  const { state, dispatch } = useDesignStore();

  const selectedModule = selectSelectedModule(state);
  const currentPackageContent = selectSelectedModulePackage(state);
  const currentSectionStatuses = selectSectionStatuses(currentPackageContent);
  const moduleConnections = state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId);
  const generatedPayload = selectGenerationPayloadSource(currentPackageContent);
  const transitionReadiness = selectTransitionReadiness(currentPackageContent);
  const approvedLeafReadyModules = selectEligibleLeafReadyModules(state);
  const canShowPayloadPreview = selectCanShowPayloadPreview(state.ui.workspaceMode, selectedModule, currentPackageContent);
  const validationIssues = selectValidationIssues(state);
  const moduleValidationIssues = selectValidationIssuesForModule(state, state.selectedModuleId);
  const designHasValidationIssues = selectDesignHasValidationIssues(state);
  const isSelectedModuleValidForReviewOrHandoff = selectModuleIsValidForReviewOrHandoff(state, state.selectedModuleId);
  const selectedSuggestions = state.suggestionsByModuleId[state.selectedModuleId] ?? [];

  const updateCurrentPackage = (updater: (current: ModulePackage) => ModulePackage) => {
    dispatch({ type: 'update_selected_module_package', payload: { updater } });
  };

  const regenerateSuggestionsForSelectedModule = () => {
    if (!selectedModule) {
      return;
    }

    dispatch({
      type: 'set_suggestions_for_module',
      payload: {
        moduleId: selectedModule.id,
        suggestions: []
      }
    });
    dispatch({ type: 'select_module', payload: { moduleId: selectedModule.id } });
  };

  const updateSuggestion = (suggestionId: string, updater: (current: SuggestionCard) => SuggestionCard) => {
    dispatch({ type: 'update_suggestion', payload: { moduleId: state.selectedModuleId, suggestionId, updater } });
  };

  const rejectSuggestion = (suggestionId: string) => {
    dispatch({ type: 'reject_suggestion', payload: { moduleId: state.selectedModuleId, suggestionId } });
  };

  const acceptSuggestion = (suggestion: SuggestionCard) => {
    dispatch({ type: 'apply_accepted_suggestion', payload: { moduleId: state.selectedModuleId, suggestion } });
  };

  const moveToNextPackageState = () => {
    if (!transitionReadiness || !transitionReadiness.canTransition) {
      return;
    }

    dispatch({ type: 'move_selected_package_state_forward', payload: { to: transitionReadiness.to } });
  };

  const createModule = () => {
    const cleanName = state.ui.newModuleName.trim() || 'unnamed_module';
    const nextId = `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
    dispatch({ type: 'create_module', payload: { name: state.ui.newModuleName, kind: state.ui.newModuleKind, nextId } });
  };

  const renameSelectedModule = () => {
    dispatch({ type: 'rename_module', payload: { moduleId: state.selectedModuleId, name: state.ui.renameDraft } });
  };

  const addConnection = () => {
    const nextConnection = { ...state.ui.connectionDraft, signal: state.ui.connectionDraft.signal.trim() };
    if (!nextConnection.fromModuleId || !nextConnection.toModuleId || !nextConnection.signal) {
      return;
    }

    dispatch({ type: 'connect_modules', payload: { connection: nextConnection } });
  };

  const markSelectedModuleAsHandedOff = () => {
    dispatch({ type: 'mark_selected_module_handed_off', payload: {} });
  };

  const exportCurrentProject = () => {
    const exported = exportProjectSnapshot(state);
    triggerProjectDownload(exported.filename, exported.json);
    dispatch({ type: 'set_project_import_error', payload: { message: null } });
  };

  const importProjectFromFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const raw = await file.text();
    const imported = importProjectSnapshot(raw);
    if (!imported.ok) {
      dispatch({ type: 'set_project_import_error', payload: { message: getProjectImportErrorMessage(imported.reason) } });
      return;
    }
    if (!imported.state) {
      dispatch({ type: 'set_project_import_error', payload: { message: getProjectImportErrorMessage('invalid_restore_state') } });
      return;
    }

    dispatch({ type: 'replace_design_state', payload: { state: imported.state } });
    dispatch({ type: 'set_project_import_error', payload: { message: null } });
  };

  const selectedModuleHandedOffAt = state.handedOffAtByModuleId[state.selectedModuleId];
  const isSelectedModuleHandoffReady = approvedLeafReadyModules.some((moduleNode) => moduleNode.id === state.selectedModuleId)
    && isSelectedModuleValidForReviewOrHandoff;

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP — Main Workspace</header>
      <main className="workspace-grid">
        <AISuggestionsPanel
          selectedModule={selectedModule}
          regenerateSuggestionsForSelectedModule={regenerateSuggestionsForSelectedModule}
          selectedSuggestions={selectedSuggestions}
          updateSuggestion={updateSuggestion}
          acceptSuggestion={acceptSuggestion}
          rejectSuggestion={rejectSuggestion}
        />

        <DiagramWorkspace
          state={state}
          setNewModuleName={(value) => dispatch({ type: 'set_new_module_name', payload: { value } })}
          setNewModuleKind={(value) => dispatch({ type: 'set_new_module_kind', payload: { value } })}
          createModule={createModule}
          selectModule={(moduleId) => dispatch({ type: 'select_module', payload: { moduleId } })}
          setRenameDraft={(value) => dispatch({ type: 'set_rename_draft', payload: { value } })}
          selectedModule={selectedModule}
          renameSelectedModule={renameSelectedModule}
          setConnectionDraft={(value) => dispatch({ type: 'set_connection_draft', payload: { value } })}
          addConnection={addConnection}
        />

        <ModulePackagePanel
          selectedModule={selectedModule}
          state={state}
          setWorkspaceMode={(mode) => dispatch({ type: 'set_workspace_mode', payload: { mode } })}
          currentPackageContent={currentPackageContent}
          transitionReadiness={transitionReadiness}
          moveToNextPackageState={moveToNextPackageState}
          currentSectionStatuses={currentSectionStatuses}
          updateCurrentPackage={updateCurrentPackage}
          moduleConnections={moduleConnections}
          canShowPayloadPreview={canShowPayloadPreview}
          generatedPayload={generatedPayload}
          approvedLeafReadyModules={approvedLeafReadyModules}
          selectModule={(moduleId) => dispatch({ type: 'select_module', payload: { moduleId } })}
          markSelectedModuleAsHandedOff={markSelectedModuleAsHandedOff}
          exportCurrentProject={exportCurrentProject}
          importProjectFromFile={importProjectFromFile}
          isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
          selectedModuleHandedOffAt={selectedModuleHandedOffAt}
          moduleValidationIssues={moduleValidationIssues}
          designHasValidationIssues={designHasValidationIssues || validationIssues.length > 0}
          isSelectedModuleValidForReviewOrHandoff={isSelectedModuleValidForReviewOrHandoff}
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
