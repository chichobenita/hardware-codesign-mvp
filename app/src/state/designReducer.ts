import { type ModulePackage } from '../../../shared/src';
import type { DesignState, ModuleNode } from '../types';
import type { DesignAction } from './designActions';
import { normalizeDesignState } from './normalization/normalizeDesignState';
import { normalizeHierarchyForPackages } from './hierarchy/hierarchyHelpers';
import {
  baseSeedState,
  createModulePackage,
  defaultConnectionDraft,
  nowIso,
  sanitizeModuleIdSegment
} from './reducerHelpers/seedState';
import {
  applyAcceptedSuggestion
} from './reducerHelpers/suggestionSync';

function normalizeInteractiveState(state: DesignState): DesignState {
  return normalizeDesignState(state, { ensureUi: true, ensureSuggestions: true });
}

function buildUniqueModuleId(state: DesignState, parentModuleId: string | undefined, cleanName: string, index = 0): string {
  const base = parentModuleId
    ? `${sanitizeModuleIdSegment(parentModuleId)}_${sanitizeModuleIdSegment(cleanName)}`
    : sanitizeModuleIdSegment(cleanName);
  const withIndex = index > 0 ? `${base}_${index + 1}` : base;
  const existingIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  return existingIds.has(withIndex) ? buildUniqueModuleId(state, parentModuleId, cleanName, index + 1) : withIndex;
}

function applyModulePackageUpdate(
  state: DesignState,
  moduleId: string,
  updater: (current: ModulePackage) => ModulePackage,
  timestamp: string
): DesignState {
  const currentPackage = state.packageContentByModuleId[moduleId];
  if (!currentPackage) {
    return state;
  }

  const nextPackage = {
    ...updater(currentPackage),
    moduleId,
    lastUpdatedAt: timestamp,
    lastUpdatedBy: 'mock_user'
  };

  return normalizeInteractiveState({
    ...state,
    packageContentByModuleId: normalizeHierarchyForPackages(state.moduleList, {
      ...state.packageContentByModuleId,
      [moduleId]: nextPackage
    })
  });
}

function createModuleNode(kind: ModuleNode['kind'], nextId: string, cleanName: string): ModuleNode {
  return { id: nextId, name: cleanName, kind };
}

export { defaultConnectionDraft };

export const seedState: DesignState = normalizeInteractiveState(baseSeedState);

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case 'create_module': {
      const cleanName = action.payload.name.trim() || 'unnamed_module';
      const timestamp = nowIso(action.payload.nowIso);
      const parentModuleId = action.payload.parentModuleId;
      const parentPackage = parentModuleId ? state.packageContentByModuleId[parentModuleId] : undefined;
      const nextId = action.payload.nextId ?? buildUniqueModuleId(state, parentModuleId, cleanName);
      const parentPath = parentPackage?.hierarchy?.hierarchyPath;
      const newPackage = createModulePackage(nextId, cleanName, timestamp, {
        parentModuleId,
        hierarchyPath: parentModuleId ? [...(parentPath ?? []), cleanName] : [cleanName]
      });

      const nextPackageContentByModuleId: DesignState['packageContentByModuleId'] = {
        ...state.packageContentByModuleId,
        [nextId]: newPackage
      };

      if (parentModuleId && parentPackage) {
        nextPackageContentByModuleId[parentModuleId] = {
          ...parentPackage,
          hierarchy: {
            ...parentPackage.hierarchy,
            parentModuleId: parentPackage.hierarchy?.parentModuleId ?? '',
            childModuleIds: [...(parentPackage.hierarchy?.childModuleIds ?? []), nextId],
            hierarchyPath: parentPackage.hierarchy?.hierarchyPath ?? [parentPackage.identity?.name ?? parentModuleId]
          },
          decompositionStatus: {
            decompositionStatus: 'composite',
            decompositionRationale: parentPackage.decompositionStatus?.decompositionRationale ?? 'Contains child modules.',
            stopReason: parentPackage.decompositionStatus?.stopReason,
            stopRecommendedBy: parentPackage.decompositionStatus?.stopRecommendedBy,
            furtherDecompositionNotes: parentPackage.decompositionStatus?.furtherDecompositionNotes
          },
          lastUpdatedAt: timestamp,
          lastUpdatedBy: 'mock_user'
        };
      }

      return normalizeInteractiveState({
        ...state,
        moduleList: [...state.moduleList, createModuleNode(action.payload.kind, nextId, cleanName)],
        selectedModuleId: nextId,
        packageContentByModuleId: nextPackageContentByModuleId,
        ui: {
          ...state.ui,
          currentHierarchyModuleId: parentModuleId || state.ui.currentHierarchyModuleId,
          newModuleName: '',
          newModuleKind: action.payload.kind,
          connectionDraft: {
            ...state.ui.connectionDraft,
            toModuleId: nextId
          }
        }
      });
    }
    case 'decompose_selected_module': {
      const parentId = state.selectedModuleId;
      const parentModule = state.moduleList.find((moduleNode) => moduleNode.id === parentId);
      const parentPackage = state.packageContentByModuleId[parentId];
      if (!parentModule || !parentPackage || action.payload.childNames.length === 0) {
        return state;
      }

      const timestamp = nowIso(action.payload.nowIso);
      const existingChildIds = parentPackage.hierarchy?.childModuleIds ?? [];
      const nextPackageContentByModuleId: DesignState['packageContentByModuleId'] = { ...state.packageContentByModuleId };
      const nextModuleList: ModuleNode[] = state.moduleList.map((moduleNode) => (
        moduleNode.id === parentId ? { ...moduleNode, kind: 'composite' as const } : moduleNode
      ));
      const newChildIds: string[] = [];

      action.payload.childNames.forEach((rawName) => {
        const cleanName = rawName.trim();
        if (!cleanName) {
          return;
        }
        const nextId = buildUniqueModuleId({ ...state, moduleList: [...state.moduleList, ...nextModuleList.filter((item) => !state.moduleList.some((existing) => existing.id === item.id))] }, parentId, cleanName, newChildIds.length);
        const childPackage = createModulePackage(nextId, cleanName, timestamp, {
          parentModuleId: parentId,
          hierarchyPath: [...(parentPackage.hierarchy?.hierarchyPath ?? []), cleanName]
        });
        nextModuleList.push(createModuleNode(action.payload.childKind, nextId, cleanName));
        nextPackageContentByModuleId[nextId] = childPackage;
        newChildIds.push(nextId);
      });

      nextPackageContentByModuleId[parentId] = {
        ...parentPackage,
        hierarchy: {
          ...parentPackage.hierarchy,
          parentModuleId: parentPackage.hierarchy?.parentModuleId ?? '',
          childModuleIds: [...existingChildIds, ...newChildIds],
          hierarchyPath: parentPackage.hierarchy?.hierarchyPath ?? [parentPackage.identity?.name ?? parentId]
        },
        decompositionStatus: {
          decompositionStatus: 'composite',
          decompositionRationale: parentPackage.decompositionStatus?.decompositionRationale || 'Decomposed into child modules for planning.',
          stopReason: parentPackage.decompositionStatus?.stopReason,
          stopRecommendedBy: parentPackage.decompositionStatus?.stopRecommendedBy,
          furtherDecompositionNotes: parentPackage.decompositionStatus?.furtherDecompositionNotes
        },
        lastUpdatedAt: timestamp,
        lastUpdatedBy: 'mock_user'
      };

      return normalizeInteractiveState({
        ...state,
        moduleList: nextModuleList,
        packageContentByModuleId: nextPackageContentByModuleId,
        ui: {
          ...state.ui,
          currentHierarchyModuleId: parentId,
          decompositionDraft: {
            namesText: '',
            childKind: action.payload.childKind
          }
        }
      });
    }
    case 'rename_module': {
      const cleanName = action.payload.name.trim();
      if (!cleanName) {
        return state;
      }

      return applyModulePackageUpdate(
        state,
        action.payload.moduleId,
        (current) => ({
          ...current,
          identity: { ...current.identity, name: cleanName }
        }),
        nowIso(action.payload.nowIso)
      );
    }
    case 'select_module':
      return normalizeInteractiveState({ ...state, selectedModuleId: action.payload.moduleId });
    case 'set_workspace_mode':
      return { ...state, ui: { ...state.ui, workspaceMode: action.payload.mode } };
    case 'enter_hierarchy_view':
      return normalizeInteractiveState({
        ...state,
        selectedModuleId: action.payload.moduleId,
        ui: { ...state.ui, currentHierarchyModuleId: action.payload.moduleId }
      });
    case 'navigate_to_parent_hierarchy': {
      const currentParentId = state.packageContentByModuleId[state.ui.currentHierarchyModuleId]?.hierarchy?.parentModuleId?.trim();
      if (!currentParentId) {
        return state;
      }
      return normalizeInteractiveState({
        ...state,
        selectedModuleId: currentParentId,
        ui: { ...state.ui, currentHierarchyModuleId: currentParentId }
      });
    }
    case 'set_hierarchy_view':
      return normalizeInteractiveState({
        ...state,
        selectedModuleId: action.payload.moduleId,
        ui: { ...state.ui, currentHierarchyModuleId: action.payload.moduleId }
      });
    case 'set_new_module_name':
      return { ...state, ui: { ...state.ui, newModuleName: action.payload.value } };
    case 'set_new_module_kind':
      return { ...state, ui: { ...state.ui, newModuleKind: action.payload.value } };
    case 'set_rename_draft':
      return { ...state, ui: { ...state.ui, renameDraft: action.payload.value } };
    case 'set_connection_draft':
      return { ...state, ui: { ...state.ui, connectionDraft: action.payload.value } };
    case 'set_decomposition_names_text':
      return {
        ...state,
        ui: {
          ...state.ui,
          decompositionDraft: {
            ...state.ui.decompositionDraft,
            namesText: action.payload.value
          }
        }
      };
    case 'set_decomposition_child_kind':
      return {
        ...state,
        ui: {
          ...state.ui,
          decompositionDraft: {
            ...state.ui.decompositionDraft,
            childKind: action.payload.value
          }
        }
      };
    case 'set_project_import_error':
      return { ...state, ui: { ...state.ui, projectImportError: action.payload.message } };
    case 'connect_modules': {
      const withConnection = {
        ...state,
        connections: [...state.connections, action.payload.connection],
        ui: {
          ...state.ui,
          connectionDraft: {
            ...action.payload.connection,
            signal: ''
          }
        }
      };

      return normalizeInteractiveState(withConnection);
    }
    case 'update_selected_module_package':
      return applyModulePackageUpdate(state, state.selectedModuleId, action.payload.updater, nowIso(action.payload.nowIso));
    case 'update_module_package':
      return applyModulePackageUpdate(state, action.payload.moduleId, action.payload.updater, nowIso(action.payload.nowIso));
    case 'apply_accepted_suggestion': {
      const withPackageUpdate = applyModulePackageUpdate(
        state,
        action.payload.moduleId,
        (current) => applyAcceptedSuggestion(current, action.payload.suggestion),
        nowIso(action.payload.nowIso)
      );
      const suggestions = withPackageUpdate.suggestionsByModuleId[action.payload.moduleId] ?? [];

      return {
        ...withPackageUpdate,
        suggestionsByModuleId: {
          ...withPackageUpdate.suggestionsByModuleId,
          [action.payload.moduleId]: suggestions.map((item) =>
            item.id === action.payload.suggestion.id ? { ...item, status: 'accepted' } : item
          )
        }
      };
    }
    case 'update_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.map((suggestion) =>
            suggestion.id === action.payload.suggestionId ? action.payload.updater(suggestion) : suggestion
          )
        }
      };
    }
    case 'reject_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.map((suggestion) =>
            suggestion.id === action.payload.suggestionId ? { ...suggestion, status: 'rejected' } : suggestion
          )
        }
      };
    }
    case 'set_suggestions_for_module':
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: action.payload.suggestions
        }
      };
    case 'remove_suggestion': {
      const moduleSuggestions = state.suggestionsByModuleId[action.payload.moduleId] ?? [];
      return {
        ...state,
        suggestionsByModuleId: {
          ...state.suggestionsByModuleId,
          [action.payload.moduleId]: moduleSuggestions.filter((suggestion) => suggestion.id !== action.payload.suggestionId)
        }
      };
    }
    case 'move_selected_package_state_forward':
      return applyModulePackageUpdate(
        state,
        state.selectedModuleId,
        (current) => ({ ...current, packageStatus: action.payload.to }),
        nowIso(action.payload.nowIso)
      );
    case 'mark_selected_module_handed_off': {
      const timestamp = nowIso(action.payload.nowIso);
      const withPackageUpdate = applyModulePackageUpdate(
        state,
        state.selectedModuleId,
        (current) => ({ ...current, packageStatus: 'handed_off' }),
        timestamp
      );
      return {
        ...withPackageUpdate,
        handedOffAtByModuleId: {
          ...withPackageUpdate.handedOffAtByModuleId,
          [state.selectedModuleId]: timestamp
        }
      };
    }
    case 'load_persisted_design_state':
      return normalizeInteractiveState(action.payload.state);
    case 'replace_design_state':
      return normalizeInteractiveState(action.payload.state);
    default:
      return state;
  }
}
