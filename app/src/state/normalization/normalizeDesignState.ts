import { getAuthoritativeModuleName, type ModulePackage } from '../../../../shared/src';
import type { Connection, DesignState, ModuleNode } from '../../types';
import { createMockSuggestions } from '../reducerHelpers/suggestionSync';
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
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);
  const moduleIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  const fallbackFromId = state.moduleList[0]?.id ?? '';
  const fallbackToId = state.moduleList[1]?.id ?? fallbackFromId;
  const currentDraft = state.ui.connectionDraft;

  return {
    ...state,
    ui: {
      ...state.ui,
      renameDraft: selectedModule?.name ?? '',
      connectionDraft: {
        ...currentDraft,
        fromModuleId: moduleIds.has(currentDraft.fromModuleId) ? currentDraft.fromModuleId : fallbackFromId,
        toModuleId: moduleIds.has(currentDraft.toModuleId) ? currentDraft.toModuleId : fallbackToId
      }
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
  const normalizedPackages = normalizePackageMap(normalizedModuleList, state.packageContentByModuleId, fallbackUpdatedBy);
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
    )
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
  persistedState: Pick<DesignState, 'moduleList' | 'selectedModuleId' | 'connections' | 'packageContentByModuleId' | 'handedOffAtByModuleId'>,
  fallbackUpdatedBy = 'restored_snapshot'
): DesignState {
  const normalizedModuleList = normalizeModuleList(persistedState.moduleList, persistedState.packageContentByModuleId);

  return normalizeDesignState(
    {
      moduleList: normalizedModuleList,
      selectedModuleId: persistedState.selectedModuleId,
      connections: persistedState.connections,
      packageContentByModuleId: persistedState.packageContentByModuleId,
      handedOffAtByModuleId: persistedState.handedOffAtByModuleId,
      suggestionsByModuleId: {},
      ui: {
        workspaceMode: 'design',
        newModuleName: '',
        newModuleKind: 'leaf',
        renameDraft: normalizedModuleList.find((moduleNode) => moduleNode.id === persistedState.selectedModuleId)?.name ?? '',
        connectionDraft: defaultConnectionDraft(normalizedModuleList)
      }
    },
    { fallbackUpdatedBy, ensureUi: true, ensureSuggestions: false }
  );
}
