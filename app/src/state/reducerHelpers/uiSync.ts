import type { DesignState } from '../../types';

export function syncRenameDraft(state: DesignState): DesignState {
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);

  return {
    ...state,
    ui: {
      ...state.ui,
      renameDraft: selectedModule?.name ?? ''
    }
  };
}

export function syncConnectionDraftOptions(state: DesignState): DesignState {
  const moduleIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  const fallbackFromId = state.moduleList[0]?.id ?? '';
  const fallbackToId = state.moduleList[1]?.id ?? fallbackFromId;
  const currentDraft = state.ui.connectionDraft;

  return {
    ...state,
    ui: {
      ...state.ui,
      connectionDraft: {
        ...currentDraft,
        fromModuleId: moduleIds.has(currentDraft.fromModuleId) ? currentDraft.fromModuleId : fallbackFromId,
        toModuleId: moduleIds.has(currentDraft.toModuleId) ? currentDraft.toModuleId : fallbackToId
      }
    }
  };
}
