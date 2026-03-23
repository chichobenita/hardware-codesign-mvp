import type { ModuleKind, ModulePackage } from '../../../../shared/src';
import { createPendingProviderJob, executeProviderHandoff } from '../../ai/handoffExecution';
import type { AiProposal } from '../../ai/proposals/proposalTypes';
import { createPreparedHandoffArtifactFromState } from '../../ai/handoffArtifacts';
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
import type { Connection, DesignState, DiagramViewportMode, SecondaryWorkspace, WorkspaceMode } from '../../types';

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

  const regenerateProposalsForSelectedModule = () => {
    if (!viewModel.selectedModule) {
      return;
    }

    dispatch({
      type: 'set_proposals_for_module',
      payload: {
        moduleId: viewModel.selectedModule.id,
        proposals: []
      }
    });
    dispatch({ type: 'select_module', payload: { moduleId: viewModel.selectedModule.id } });
  };

  const updateProposal = (proposalId: string, updater: (current: AiProposal) => AiProposal) => {
    dispatch({ type: 'update_proposal', payload: { moduleId: state.selectedModuleId, proposalId, updater } });
  };

  const rejectProposal = (proposalId: string) => {
    dispatch({ type: 'reject_proposal', payload: { moduleId: state.selectedModuleId, proposalId } });
  };

  const applyProposal = (proposal: AiProposal) => {
    dispatch({ type: 'apply_proposal', payload: { moduleId: state.selectedModuleId, proposal } });
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

  const markSelectedModuleAsHandedOff = async () => {
    const startedAt = new Date().toISOString();
    const artifact = createPreparedHandoffArtifactFromState(state, state.selectedModuleId, state.ui.selectedProviderId, startedAt);
    if (!artifact) {
      return;
    }

    const previousAttempts = viewModel.currentProviderJob?.artifactId === artifact.artifactId
      ? viewModel.currentProviderJob.attemptCount
      : 0;
    const job = createPendingProviderJob(artifact, startedAt, previousAttempts);

    dispatch({ type: 'queue_handoff_artifact', payload: { artifact } });
    dispatch({ type: 'start_provider_job', payload: { job } });

    const executionResult = await executeProviderHandoff(artifact);
    const completedAt = new Date().toISOString();

    if (executionResult.ok) {
      dispatch({
        type: 'complete_provider_job_success',
        payload: {
          jobId: job.jobId,
          artifactId: artifact.artifactId,
          response: executionResult.response,
          completedAt
        }
      });
      return;
    }

    dispatch({
      type: 'complete_provider_job_failure',
      payload: {
        jobId: job.jobId,
        artifactId: artifact.artifactId,
        error: executionResult.error,
        completedAt
      }
    });
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
  const setSecondaryWorkspace = (workspace: SecondaryWorkspace) => dispatch({ type: 'set_secondary_workspace', payload: { workspace } });
  const setDiagramViewportMode = (mode: DiagramViewportMode) => dispatch({ type: 'set_diagram_viewport_mode', payload: { mode } });
  const toggleEdgeBundle = (groupKey: string) => dispatch({ type: 'toggle_edge_bundle', payload: { groupKey } });
  const collapseAllEdgeBundles = () => dispatch({ type: 'collapse_all_edge_bundles', payload: {} });
  const setSelectedProvider = (providerId: string) => dispatch({ type: 'set_selected_provider', payload: { providerId } });
  const setDecompositionNamesText = (value: string) => dispatch({ type: 'set_decomposition_names_text', payload: { value } });
  const setDecompositionChildKind = (value: ModuleKind) => dispatch({ type: 'set_decomposition_child_kind', payload: { value } });

  return {
    updateCurrentPackage,
    regenerateProposalsForSelectedModule,
    updateProposal,
    rejectProposal,
    applyProposal,
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
    setSecondaryWorkspace,
    setDiagramViewportMode,
    toggleEdgeBundle,
    collapseAllEdgeBundles,
    setSelectedProvider,
    setDecompositionNamesText,
    setDecompositionChildKind
  };
}
