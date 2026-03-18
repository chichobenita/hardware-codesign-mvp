import type { ModuleKind, ModulePackage } from '../../../../shared/src';
import {
  buildArtifactExportFilename,
  buildPromptExportFilename,
  copyTextToClipboard,
  serializeHandoffArtifact,
  serializePromptExport,
  triggerTextDownload
} from '../../ai/handoffExport';
import { exportProjectSnapshot, getProjectImportErrorMessage, importProjectSnapshot, triggerProjectDownload } from '../../state/designTransfer';
import type { DesignAction } from '../../state/designActions';
import type { AppWorkspaceViewModel } from '../viewModels/appWorkspaceViewModel';
import type { Connection, DesignState, SuggestionCard, WorkspaceMode } from '../../types';

function parseDecompositionNames(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

type Dispatch = React.Dispatch<DesignAction>;

export type AppWorkspaceActions = ReturnType<typeof createAppWorkspaceActions>;

export function createAppWorkspaceActions(state: DesignState, dispatch: Dispatch, viewModel: AppWorkspaceViewModel) {
  const updateCurrentPackage = (updater: (current: ModulePackage) => ModulePackage) => {
    dispatch({ type: 'update_selected_module_package', payload: { updater } });
  };

  const regenerateSuggestionsForSelectedModule = () => {
    if (!viewModel.selectedModule) {
      return;
    }

    dispatch({
      type: 'set_suggestions_for_module',
      payload: {
        moduleId: viewModel.selectedModule.id,
        suggestions: []
      }
    });
    dispatch({ type: 'select_module', payload: { moduleId: viewModel.selectedModule.id } });
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
    if (!viewModel.transitionReadiness || !viewModel.transitionReadiness.canTransition) {
      return;
    }

    dispatch({ type: 'move_selected_package_state_forward', payload: { to: viewModel.transitionReadiness.to } });
  };

  const createModule = () => {
    dispatch({
      type: 'create_module',
      payload: {
        name: state.ui.newModuleName,
        kind: state.ui.newModuleKind,
        parentModuleId: state.ui.currentHierarchyModuleId
      }
    });
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

  const copyGeneratedPrompt = async () => {
    if (!viewModel.generatedPrompt) {
      return;
    }

    await copyTextToClipboard(viewModel.generatedPrompt.promptText);
  };

  const exportGeneratedPrompt = () => {
    if (!viewModel.generatedPrompt || !viewModel.selectedModule) {
      return;
    }

    triggerTextDownload(
      buildPromptExportFilename(viewModel.selectedModule.name),
      serializePromptExport(viewModel.generatedPrompt.promptText)
    );
  };

  const exportLatestHandoffArtifact = () => {
    if (!viewModel.latestHandoffArtifact) {
      return;
    }

    triggerTextDownload(
      buildArtifactExportFilename(viewModel.latestHandoffArtifact.moduleName),
      serializeHandoffArtifact(viewModel.latestHandoffArtifact),
      'application/json;charset=utf-8'
    );
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

  const decomposeSelectedModule = () => {
    const childNames = parseDecompositionNames(state.ui.decompositionDraft.namesText);
    if (childNames.length === 0) {
      return;
    }

    dispatch({
      type: 'decompose_selected_module',
      payload: {
        childNames,
        childKind: state.ui.decompositionDraft.childKind
      }
    });
  };

  const enterSelectedComposite = () => {
    if (viewModel.selectedModule?.kind !== 'composite') {
      return;
    }

    dispatch({ type: 'enter_hierarchy_view', payload: { moduleId: viewModel.selectedModule.id } });
  };

  const selectModule = (moduleId: string) => dispatch({ type: 'select_module', payload: { moduleId } });
  const setHierarchyView = (moduleId: string) => dispatch({ type: 'set_hierarchy_view', payload: { moduleId } });
  const navigateToParentHierarchy = () => dispatch({ type: 'navigate_to_parent_hierarchy', payload: {} });
  const setNewModuleName = (value: string) => dispatch({ type: 'set_new_module_name', payload: { value } });
  const setNewModuleKind = (value: ModuleKind) => dispatch({ type: 'set_new_module_kind', payload: { value } });
  const setRenameDraft = (value: string) => dispatch({ type: 'set_rename_draft', payload: { value } });
  const setConnectionDraft = (value: Connection) => dispatch({ type: 'set_connection_draft', payload: { value } });
  const setWorkspaceMode = (mode: WorkspaceMode) => dispatch({ type: 'set_workspace_mode', payload: { mode } });
  const setSelectedProvider = (providerId: string) => dispatch({ type: 'set_selected_provider', payload: { providerId } });
  const setDecompositionNamesText = (value: string) => dispatch({ type: 'set_decomposition_names_text', payload: { value } });
  const setDecompositionChildKind = (value: ModuleKind) => dispatch({ type: 'set_decomposition_child_kind', payload: { value } });

  return {
    updateCurrentPackage,
    regenerateSuggestionsForSelectedModule,
    updateSuggestion,
    rejectSuggestion,
    acceptSuggestion,
    moveToNextPackageState,
    createModule,
    renameSelectedModule,
    addConnection,
    markSelectedModuleAsHandedOff,
    copyGeneratedPrompt,
    exportGeneratedPrompt,
    exportLatestHandoffArtifact,
    exportCurrentProject,
    importProjectFromFile,
    decomposeSelectedModule,
    enterSelectedComposite,
    selectModule,
    setHierarchyView,
    navigateToParentHierarchy,
    setNewModuleName,
    setNewModuleKind,
    setRenameDraft,
    setConnectionDraft,
    setWorkspaceMode,
    setSelectedProvider,
    setDecompositionNamesText,
    setDecompositionChildKind
  };
}
