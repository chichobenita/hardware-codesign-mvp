import { getAuthoritativeModuleName, type ModulePackage } from '../../../../shared/src';
import { DEFAULT_PROVIDER_ID } from '../../ai/providers/providerRegistry';
import { normalizeHandoffArtifacts } from '../../ai/handoffArtifacts';
import type { ModuleNode } from '../../../../shared/src';
import type { Connection, DesignState } from '../../types';
import { createMockSuggestions } from '../reducerHelpers/suggestionSync';
import { normalizeHierarchyForPackages, selectHierarchyModuleId, selectVisibleHierarchyModuleIds } from '../hierarchy/hierarchyHelpers';
import { defaultConnectionDraft } from '../reducerHelpers/seedState';
import { normalizeDependencies } from './normalizeDependencies';
import { normalizeModulePackage } from './normalizeModulePackage';

type NormalizeDesignStateOptions = {
  fallbackUpdatedBy?: string;
  ensureUi?: boolean;
  ensureSuggestions?: boolean;
};

function normalizeModuleList(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>
): ModuleNode[] {
  return moduleList.map((moduleNode) => ({
    ...moduleNode,
    name: getAuthoritativeModuleName(moduleNode.id, packageContentByModuleId[moduleNode.id], moduleNode.name)
  }));
}

function normalizePackageMap(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>,
  fallbackUpdatedBy: string
): Record<string, ModulePackage> {
  return Object.fromEntries(
    moduleList.map((moduleNode) => [
      moduleNode.id,
      normalizeModulePackage(moduleNode, packageContentByModuleId[moduleNode.id], fallbackUpdatedBy)
    ])
  ) as Record<string, ModulePackage>;
}

function normalizeUiState(state: DesignState): DesignState {
  const moduleIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  const currentHierarchyModuleId = selectHierarchyModuleId(state, state.ui.currentHierarchyModuleId);
  const visibleIds = selectVisibleHierarchyModuleIds(state, currentHierarchyModuleId);
  const selectedModuleId = visibleIds.has(state.selectedModuleId)
    ? state.selectedModuleId
    : currentHierarchyModuleId;
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === selectedModuleId);
  const fallbackFromId = state.moduleList[0]?.id ?? '';
  const fallbackToId = state.moduleList[1]?.id ?? fallbackFromId;
  const currentDraft = state.ui.connectionDraft;

  return {
    ...state,
    selectedModuleId,
    ui: {
      ...state.ui,
      selectedProviderId: state.ui.selectedProviderId || DEFAULT_PROVIDER_ID,
      currentHierarchyModuleId,
      renameDraft: selectedModule?.name ?? '',
      connectionDraft: {
        ...currentDraft,
        fromModuleId: moduleIds.has(currentDraft.fromModuleId) ? currentDraft.fromModuleId : fallbackFromId,
        toModuleId: moduleIds.has(currentDraft.toModuleId) ? currentDraft.toModuleId : fallbackToId
      },
      decompositionDraft: {
        namesText: state.ui.decompositionDraft?.namesText ?? '',
        childKind: state.ui.decompositionDraft?.childKind ?? 'leaf'
      },
      projectImportError: state.ui.projectImportError
    }
  };
}

function normalizeSuggestions(state: DesignState): DesignState {
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);
  if (!selectedModule || state.suggestionsByModuleId[selectedModule.id]) {
    return state;
  }

  const modulePackage = state.packageContentByModuleId[selectedModule.id];
  if (!modulePackage) {
    return state;
  }

  return {
    ...state,
    suggestionsByModuleId: {
      ...state.suggestionsByModuleId,
      [selectedModule.id]: createMockSuggestions(selectedModule, modulePackage)
    }
  };
}

export function normalizeDesignState(
  state: DesignState,
  options: NormalizeDesignStateOptions = {}
): DesignState {
  const fallbackUpdatedBy = options.fallbackUpdatedBy ?? 'mock_user';
  const normalizedModuleList = normalizeModuleList(state.moduleList, state.packageContentByModuleId);
  const normalizedPackages = normalizeHierarchyForPackages(
    normalizedModuleList,
    normalizePackageMap(normalizedModuleList, state.packageContentByModuleId, fallbackUpdatedBy)
  );
  const normalizedConnections: Connection[] = state.connections.filter(
    (connection) => normalizedPackages[connection.fromModuleId] && normalizedPackages[connection.toModuleId]
  );

  let nextState: DesignState = {
    ...state,
    moduleList: normalizedModuleList,
    connections: normalizedConnections,
    packageContentByModuleId: normalizeDependencies(normalizedPackages, normalizedConnections),
    handedOffAtByModuleId: Object.fromEntries(
      Object.entries(state.handedOffAtByModuleId).filter(([moduleId]) => normalizedPackages[moduleId])
    ),
    handoffArtifacts: []
  };

  nextState = {
    ...nextState,
    handoffArtifacts: normalizeHandoffArtifacts(nextState, state.handoffArtifacts.filter((artifact) => normalizedPackages[artifact.moduleId]))
  };

  if (options.ensureUi) {
    nextState = normalizeUiState(nextState);
  }

  if (options.ensureSuggestions) {
    nextState = normalizeSuggestions(nextState);
  }

  return nextState;
}

export function createRestoredDesignState(
  persistedState: Pick<DesignState, 'moduleList' | 'selectedModuleId' | 'connections' | 'packageContentByModuleId' | 'handedOffAtByModuleId' | 'handoffArtifacts'>,
  fallbackUpdatedBy = 'restored_snapshot'
): DesignState {
  const normalizedModuleList = normalizeModuleList(persistedState.moduleList, persistedState.packageContentByModuleId);
  const defaultHierarchyId = selectHierarchyModuleId({
    ...persistedState,
    moduleList: normalizedModuleList,
    suggestionsByModuleId: {},
    ui: {
      workspaceMode: 'design',
      selectedProviderId: DEFAULT_PROVIDER_ID,
      currentHierarchyModuleId: persistedState.selectedModuleId,
      newModuleName: '',
      newModuleKind: 'leaf',
      renameDraft: '',
      connectionDraft: defaultConnectionDraft(normalizedModuleList),
      decompositionDraft: { namesText: '', childKind: 'leaf' },
      projectImportError: null
    }
  } as DesignState, persistedState.selectedModuleId);

  return normalizeDesignState(
    {
      moduleList: normalizedModuleList,
      selectedModuleId: persistedState.selectedModuleId,
      connections: persistedState.connections,
      packageContentByModuleId: persistedState.packageContentByModuleId,
      handedOffAtByModuleId: persistedState.handedOffAtByModuleId,
      handoffArtifacts: persistedState.handoffArtifacts,
      suggestionsByModuleId: {},
      ui: {
        workspaceMode: 'design',
        selectedProviderId: DEFAULT_PROVIDER_ID,
        currentHierarchyModuleId: defaultHierarchyId,
        newModuleName: '',
        newModuleKind: 'leaf',
        renameDraft: normalizedModuleList.find((moduleNode) => moduleNode.id === persistedState.selectedModuleId)?.name ?? '',
        connectionDraft: defaultConnectionDraft(normalizedModuleList),
        decompositionDraft: {
          namesText: '',
          childKind: 'leaf'
        },
        projectImportError: null
      }
    },
    { fallbackUpdatedBy, ensureUi: true, ensureSuggestions: false }
  );
}
