import {
  syncDependencyDisplayEntries,
  type ModulePackage
} from '../../../shared/src';
import type { DesignState } from '../types';
import type { DesignAction } from './designActions';
import {
  syncAllDependencyDisplayEntries,
  withConnectionDependencies
} from './reducerHelpers/dependencySync';
import { syncModuleIdentityProjection } from './reducerHelpers/identitySync';
import {
  baseSeedState,
  createModulePackage,
  defaultConnectionDraft,
  nowIso
} from './reducerHelpers/seedState';
import {
  applyAcceptedSuggestion,
  ensureSelectedModuleSuggestions
} from './reducerHelpers/suggestionSync';
import {
  syncConnectionDraftOptions,
  syncRenameDraft
} from './reducerHelpers/uiSync';

function syncDerivedUiState(state: DesignState): DesignState {
  return ensureSelectedModuleSuggestions(
    syncConnectionDraftOptions(
      syncRenameDraft(
        syncModuleIdentityProjection(state)
      )
    )
  );
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

  const nextPackage = syncDependencyDisplayEntries(
    {
      ...updater(currentPackage),
      moduleId,
      lastUpdatedAt: timestamp,
      lastUpdatedBy: 'mock_user'
    },
    state.packageContentByModuleId
  );

  return syncDerivedUiState(
    syncAllDependencyDisplayEntries({
      ...state,
      packageContentByModuleId: {
        ...state.packageContentByModuleId,
        [moduleId]: nextPackage
      }
    })
  );
}

export { defaultConnectionDraft };

export const seedState: DesignState = syncDerivedUiState(baseSeedState);

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case 'create_module': {
      const cleanName = action.payload.name.trim() || 'unnamed_module';
      const timestamp = nowIso(action.payload.nowIso);
      const nextId = action.payload.nextId ?? `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
      const newPackage = createModulePackage(nextId, cleanName, timestamp);

      return syncDerivedUiState({
        ...state,
        moduleList: [...state.moduleList, { id: nextId, name: cleanName, kind: action.payload.kind }],
        selectedModuleId: nextId,
        packageContentByModuleId: { ...state.packageContentByModuleId, [nextId]: newPackage },
        ui: {
          ...state.ui,
          newModuleName: '',
          newModuleKind: action.payload.kind,
          connectionDraft: {
            ...state.ui.connectionDraft,
            toModuleId: nextId
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
        (current) => ({ ...current, identity: { ...current.identity, name: cleanName } }),
        nowIso(action.payload.nowIso)
      );
    }
    case 'select_module':
      return syncDerivedUiState({ ...state, selectedModuleId: action.payload.moduleId });
    case 'set_workspace_mode':
      return { ...state, ui: { ...state.ui, workspaceMode: action.payload.mode } };
    case 'set_new_module_name':
      return { ...state, ui: { ...state.ui, newModuleName: action.payload.value } };
    case 'set_new_module_kind':
      return { ...state, ui: { ...state.ui, newModuleKind: action.payload.value } };
    case 'set_rename_draft':
      return { ...state, ui: { ...state.ui, renameDraft: action.payload.value } };
    case 'set_connection_draft':
      return { ...state, ui: { ...state.ui, connectionDraft: action.payload.value } };
    case 'connect_modules': {
      const timestamp = nowIso(action.payload.nowIso);
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

      return syncDerivedUiState(withConnectionDependencies(withConnection, action.payload.connection, timestamp));
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
      return syncDerivedUiState(action.payload.state);
    case 'replace_design_state':
      return syncDerivedUiState(action.payload.state);
    default:
      return state;
  }
}
