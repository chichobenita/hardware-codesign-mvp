import { useEffect, useMemo, useState } from 'react';
import type { ModulePackage } from '../../shared/src';
import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import type { Connection, DesignState, ModuleNode, PersistedDesignState, SuggestionCard, WorkspaceMode } from './types';
import { DesignStoreProvider, useDesignStore } from './state/designStore';
import { defaultConnectionDraft, seedState } from './state/designReducer';
import {
  selectCanShowPayloadPreview,
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
  selectTransitionReadiness
} from './state/designSelectors';

function createMockSuggestions(moduleNode: ModuleNode, modulePackage: ModulePackage): SuggestionCard[] {
  const moduleName = modulePackage.identity?.name ?? moduleNode.name;
  const hasChildren = (modulePackage.hierarchy?.childModuleIds?.length ?? 0) > 0;

  return [
    {
      id: `${moduleNode.id}-purpose`,
      type: 'purpose_proposal',
      title: 'Purpose proposal',
      description: 'Suggested purpose statement. Accept will update Module Package → Purpose.',
      status: 'pending',
      draft: {
        summaryText: `Coordinate ${moduleName} data flow and expose a stable contract to peer modules.`
      }
    },
    {
      id: `${moduleNode.id}-behavior`,
      type: 'behavior_summary',
      title: 'Behavior summary',
      description: 'Suggested behavior summary. Accept will update Module Package → Behavior summary.',
      status: 'pending',
      draft: {
        summaryText: `On each valid cycle, ${moduleName} consumes inputs, applies internal control rules, and updates outputs deterministically.`
      }
    },
    {
      id: `${moduleNode.id}-ports`,
      type: 'ports_suggestion',
      title: 'Ports suggestion',
      description: 'Suggested interface ports. Accept will replace Module Package → Interfaces ports.',
      status: 'pending',
      draft: {
        ports: [
          { id: `${moduleNode.id}_clk`, name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: `${moduleNode.id}_rst_n`, name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: `${moduleNode.id}_valid_i`, name: 'valid_i', direction: 'input', width: '1', description: 'Input valid handshake' },
          { id: `${moduleNode.id}_ready_o`, name: 'ready_o', direction: 'output', width: '1', description: 'Output ready handshake' }
        ]
      }
    },
    {
      id: `${moduleNode.id}-decomposition`,
      type: 'decomposition_suggestion',
      title: 'Decomposition suggestion',
      description: 'Suggested decomposition status. Accept will update Module Package → Decomposition status.',
      status: 'pending',
      draft: {
        decompositionStatus: hasChildren ? 'composite' : 'candidate_leaf',
        decompositionRationale: hasChildren
          ? `${moduleName} already coordinates sub-modules and should remain composite.`
          : `${moduleName} looks self-contained enough to evaluate as a leaf candidate.`
      }
    }
  ];
}

const LOCAL_STORAGE_KEY = 'hardware-codesign-mvp.design-state.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isModuleNode(value: unknown): value is ModuleNode {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.kind === 'composite' || value.kind === 'leaf')
  );
}

function isConnection(value: unknown): value is Connection {
  return (
    isRecord(value)
    && typeof value.fromModuleId === 'string'
    && typeof value.toModuleId === 'string'
    && typeof value.signal === 'string'
  );
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isPackageMap(value: unknown): value is Record<string, ModulePackage> {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item));
}

function parsePersistedState(raw: string): PersistedDesignState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    if (!Array.isArray(parsed.moduleList) || !parsed.moduleList.every(isModuleNode)) {
      return null;
    }
    if (typeof parsed.selectedModuleId !== 'string') {
      return null;
    }
    if (!Array.isArray(parsed.connections) || !parsed.connections.every(isConnection)) {
      return null;
    }
    if (!isPackageMap(parsed.packageContentByModuleId)) {
      return null;
    }

    const handedOffAtByModuleId = isStringMap(parsed.handedOffAtByModuleId) ? parsed.handedOffAtByModuleId : {};

    return {
      moduleList: parsed.moduleList,
      selectedModuleId: parsed.selectedModuleId,
      connections: parsed.connections,
      packageContentByModuleId: parsed.packageContentByModuleId,
      handedOffAtByModuleId
    };
  } catch {
    return null;
  }
}

function loadDesignState(): DesignState {
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return seedState;
  }

  const persisted = parsePersistedState(raw);
  if (!persisted) {
    return seedState;
  }

  const moduleIds = new Set(persisted.moduleList.map((moduleNode) => moduleNode.id));
  const hasSelectedModule = moduleIds.has(persisted.selectedModuleId);
  if (!hasSelectedModule || persisted.moduleList.length === 0) {
    return seedState;
  }

  const hasPackagesForModules = persisted.moduleList.every((moduleNode) => Boolean(persisted.packageContentByModuleId[moduleNode.id]));
  if (!hasPackagesForModules) {
    return seedState;
  }

  return {
    ...persisted,
    suggestionsByModuleId: {}
  };
}

function saveDesignState(state: DesignState): void {
  const snapshot: PersistedDesignState = {
    moduleList: state.moduleList,
    selectedModuleId: state.selectedModuleId,
    connections: state.connections,
    packageContentByModuleId: state.packageContentByModuleId,
    handedOffAtByModuleId: state.handedOffAtByModuleId
  };

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
}

function AppWorkspace(): JSX.Element {
  const { state, dispatch } = useDesignStore();
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('design');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleKind, setNewModuleKind] = useState<ModuleNode['kind']>('leaf');
  const [renameDraft, setRenameDraft] = useState('');
  const [connectionDraft, setConnectionDraft] = useState<Connection>(defaultConnectionDraft(seedState.moduleList));

  const selectedModule = selectSelectedModule(state);
  const currentPackageContent = selectSelectedModulePackage(state);
  const currentSectionStatuses = useMemo(() => selectSectionStatuses(currentPackageContent), [currentPackageContent]);
  const moduleConnections = state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId);
  const generatedPayload = useMemo(() => selectGenerationPayloadSource(currentPackageContent), [currentPackageContent]);
  const transitionReadiness = useMemo(() => selectTransitionReadiness(currentPackageContent), [currentPackageContent]);
  const approvedLeafReadyModules = useMemo(() => selectEligibleLeafReadyModules(state), [state]);
  const canShowPayloadPreview = useMemo(
    () => selectCanShowPayloadPreview(workspaceMode, selectedModule, currentPackageContent),
    [currentPackageContent, selectedModule, workspaceMode]
  );

  useEffect(() => {
    if (!selectedModule || state.suggestionsByModuleId[selectedModule.id]) {
      return;
    }

    dispatch({
      type: 'set_suggestions_for_module',
      payload: {
        moduleId: selectedModule.id,
        suggestions: createMockSuggestions(selectedModule, currentPackageContent)
      }
    });
  }, [currentPackageContent, dispatch, selectedModule, state.suggestionsByModuleId]);

  useEffect(() => {
    saveDesignState(state);
  }, [state]);

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
        suggestions: createMockSuggestions(selectedModule, currentPackageContent)
      }
    });
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
    const cleanName = newModuleName.trim() || 'unnamed_module';
    const nextId = `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
    dispatch({ type: 'create_module', payload: { name: newModuleName, kind: newModuleKind, nextId } });
    setRenameDraft(cleanName);
    setConnectionDraft((current) => ({ ...current, toModuleId: nextId }));
  };

  const renameSelectedModule = () => {
    dispatch({ type: 'rename_module', payload: { moduleId: state.selectedModuleId, name: renameDraft } });
  };

  const addConnection = () => {
    const nextConnection = { ...connectionDraft, signal: connectionDraft.signal.trim() };
    if (!nextConnection.fromModuleId || !nextConnection.toModuleId || !nextConnection.signal) {
      return;
    }

    dispatch({ type: 'connect_modules', payload: { connection: nextConnection } });
  };

  const markSelectedModuleAsHandedOff = () => {
    dispatch({ type: 'mark_selected_module_handed_off', payload: {} });
  };

  const selectedModuleHandedOffAt = state.handedOffAtByModuleId[state.selectedModuleId];
  const isSelectedModuleHandoffReady = approvedLeafReadyModules.some((moduleNode) => moduleNode.id === state.selectedModuleId);

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
          newModuleName={newModuleName}
          setNewModuleName={(value) => setNewModuleName(value)}
          newModuleKind={newModuleKind}
          setNewModuleKind={setNewModuleKind}
          createModule={createModule}
          selectModule={(moduleId) => dispatch({ type: 'select_module', payload: { moduleId } })}
          renameDraft={renameDraft}
          setRenameDraft={(value) => setRenameDraft(value)}
          selectedModule={selectedModule}
          renameSelectedModule={renameSelectedModule}
          connectionDraft={connectionDraft}
          setConnectionDraft={setConnectionDraft}
          addConnection={addConnection}
        />

        <ModulePackagePanel
          selectedModule={selectedModule}
          state={state}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
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
          isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
          selectedModuleHandedOffAt={selectedModuleHandedOffAt}
        />
      </main>
    </div>
  );
}

export function App(): JSX.Element {
  const [initialState] = useState<DesignState>(() => loadDesignState());
  return (
    <DesignStoreProvider initialState={initialState}>
      <AppWorkspace />
    </DesignStoreProvider>
  );
}

export default App;
