import { getAuthoritativeModuleName, type ModulePackage } from '../../../../shared/src';
import { normalizeHandoffArtifacts } from '../../ai/handoffArtifacts';
import { DEFAULT_PROVIDER_ID } from '../../ai/providers/providerRegistry';
import type { Connection, DesignState, DiagramViewportMode, ModuleNode, SecondaryWorkspace } from '../../types';
import { ensureSelectedModuleProposals } from '../reducerHelpers/proposalSync';
import { defaultConnectionDraft } from '../reducerHelpers/seedState';
import { normalizeDependencies } from './normalizeDependencies';
import { normalizeModulePackage } from './normalizeModulePackage';

type NormalizeDesignStateOptions = {
  fallbackUpdatedBy?: string;
  ensureUi?: boolean;
  ensureProposals?: boolean;
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

function visibleModuleIdsForHierarchy(state: DesignState, hierarchyModuleId: string): Set<string> {
  const hierarchyPackage = state.packageContentByModuleId[hierarchyModuleId];
  const childIds = hierarchyPackage?.hierarchy?.childModuleIds ?? [];
  const inferredChildIds = state.moduleList
    .filter((moduleNode) => state.packageContentByModuleId[moduleNode.id]?.hierarchy?.parentModuleId === hierarchyModuleId)
    .map((moduleNode) => moduleNode.id);
  return new Set([hierarchyModuleId, ...childIds, ...inferredChildIds]);
}

function secondaryWorkspaceForMode(mode: DesignState['ui']['workspaceMode']): SecondaryWorkspace {
  if (mode === 'review') {
    return 'review';
  }
  if (mode === 'handoff') {
    return 'handoff';
  }
  return 'none';
}

function normalizeViewportMode(mode: string | undefined): DiagramViewportMode {
  if (mode === 'focus_selection' || mode === 'overview') {
    return mode;
  }
  return 'fit_scope';
}

function normalizeUiState(state: DesignState): DesignState {
  const moduleIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  const fallbackHierarchyId = state.moduleList.find((moduleNode) => moduleNode.kind === 'composite')?.id ?? state.moduleList[0]?.id ?? '';
  const currentHierarchyModuleId = moduleIds.has(state.ui.currentHierarchyModuleId)
    ? state.ui.currentHierarchyModuleId
    : fallbackHierarchyId;
  const visibleIds = visibleModuleIdsForHierarchy(state, currentHierarchyModuleId);
  const selectedModuleId = visibleIds.has(state.selectedModuleId)
    ? state.selectedModuleId
    : currentHierarchyModuleId;
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === selectedModuleId);
  const fallbackDraft = defaultConnectionDraft(state.moduleList);
  const currentDraft = state.ui.connectionDraft;

  return {
    ...state,
    selectedModuleId,
    ui: {
      ...state.ui,
      workspaceMode: state.ui.workspaceMode ?? 'design',
      secondaryWorkspace: state.ui.secondaryWorkspace ?? secondaryWorkspaceForMode(state.ui.workspaceMode ?? 'design'),
      currentHierarchyModuleId,
      newModuleName: state.ui.newModuleName ?? '',
      newModuleKind: state.ui.newModuleKind ?? 'leaf',
      renameDraft: selectedModule?.name ?? '',
      connectionDraft: {
        ...currentDraft,
        fromModuleId: moduleIds.has(currentDraft.fromModuleId) ? currentDraft.fromModuleId : fallbackDraft.fromModuleId,
        toModuleId: moduleIds.has(currentDraft.toModuleId) ? currentDraft.toModuleId : fallbackDraft.toModuleId
      },
      decompositionDraft: {
        namesText: state.ui.decompositionDraft?.namesText ?? '',
        childKind: state.ui.decompositionDraft?.childKind ?? 'leaf'
      },
      projectImportError: state.ui.projectImportError ?? null,
      aiComposerText: state.ui.aiComposerText ?? '',
      selectedProviderId: state.ui.selectedProviderId ?? DEFAULT_PROVIDER_ID,
      diagramViewportMode: normalizeViewportMode(state.ui.diagramViewportMode),
      expandedEdgeBundleKeys: Array.isArray(state.ui.expandedEdgeBundleKeys) ? state.ui.expandedEdgeBundleKeys : []
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
      Object.entries(state.handedOffAtByModuleId ?? {}).filter(([moduleId]) => normalizedPackages[moduleId])
    ),
    suggestionsByModuleId: state.suggestionsByModuleId ?? {},
    proposalsByModuleId: state.proposalsByModuleId ?? {},
    handoffArtifacts: state.handoffArtifacts ?? [],
    providerJobs: state.providerJobs ?? [],
    aiChatHistory: state.aiChatHistory ?? []
  };

  nextState = {
    ...nextState,
    handoffArtifacts: normalizeHandoffArtifacts(nextState, nextState.handoffArtifacts)
  };

  const validArtifactIds = new Set(nextState.handoffArtifacts.map((artifact) => artifact.artifactId));
  nextState = {
    ...nextState,
    providerJobs: nextState.providerJobs.filter((job) => validArtifactIds.has(job.artifactId))
  };

  if (options.ensureUi) {
    nextState = normalizeUiState(nextState);
  }

  if (options.ensureProposals) {
    nextState = ensureSelectedModuleProposals(nextState);
  }

  return nextState;
}

export function createRestoredDesignState(
  persistedState: Pick<DesignState, 'moduleList' | 'selectedModuleId' | 'connections' | 'packageContentByModuleId' | 'handedOffAtByModuleId' | 'handoffArtifacts'>,
  fallbackUpdatedBy = 'restored_snapshot'
): DesignState {
  const normalizedModuleList = normalizeModuleList(persistedState.moduleList, persistedState.packageContentByModuleId);
  const selectedPackage = persistedState.packageContentByModuleId[persistedState.selectedModuleId];
  const selectedHasHierarchyAnchor = Boolean(
    selectedPackage?.hierarchy?.parentModuleId
    || (selectedPackage?.hierarchy?.childModuleIds?.length ?? 0) > 0
  );
  const defaultHierarchyId = selectedHasHierarchyAnchor
    ? normalizedModuleList.find((moduleNode) => moduleNode.kind === 'composite')?.id ?? persistedState.selectedModuleId
    : persistedState.selectedModuleId;

  return normalizeDesignState(
    {
      moduleList: normalizedModuleList,
      selectedModuleId: persistedState.selectedModuleId,
      connections: persistedState.connections,
      packageContentByModuleId: persistedState.packageContentByModuleId,
      handedOffAtByModuleId: persistedState.handedOffAtByModuleId,
      handoffArtifacts: persistedState.handoffArtifacts,
      providerJobs: [],
      suggestionsByModuleId: {},
      proposalsByModuleId: {},
      aiChatHistory: [],
      ui: {
        workspaceMode: 'design',
        secondaryWorkspace: 'none',
        currentHierarchyModuleId: defaultHierarchyId,
        newModuleName: '',
        newModuleKind: 'leaf',
        renameDraft: normalizedModuleList.find((moduleNode) => moduleNode.id === persistedState.selectedModuleId)?.name ?? '',
        connectionDraft: defaultConnectionDraft(normalizedModuleList),
        decompositionDraft: {
          namesText: '',
          childKind: 'leaf'
        },
        projectImportError: null,
        aiComposerText: '',
        selectedProviderId: DEFAULT_PROVIDER_ID,
        diagramViewportMode: 'fit_scope',
        expandedEdgeBundleKeys: []
      }
    },
    { fallbackUpdatedBy, ensureUi: true, ensureProposals: false }
  );
}
