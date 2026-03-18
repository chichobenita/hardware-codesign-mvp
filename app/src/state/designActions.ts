import type { ModulePackage } from '../../../shared/src';
import type { Connection, DesignState, ModuleNode, SuggestionCard, WorkspaceMode } from '../types';

export type DesignAction =
  | { type: 'create_module'; payload: { name: string; kind: ModuleNode['kind']; parentModuleId?: string; nextId?: string; nowIso?: string } }
  | { type: 'decompose_selected_module'; payload: { childNames: string[]; childKind: ModuleNode['kind']; nowIso?: string } }
  | { type: 'rename_module'; payload: { moduleId: string; name: string; nowIso?: string } }
  | { type: 'select_module'; payload: { moduleId: string } }
  | { type: 'set_workspace_mode'; payload: { mode: WorkspaceMode } }
  | { type: 'enter_hierarchy_view'; payload: { moduleId: string } }
  | { type: 'navigate_to_parent_hierarchy'; payload: {} }
  | { type: 'set_hierarchy_view'; payload: { moduleId: string } }
  | { type: 'set_new_module_name'; payload: { value: string } }
  | { type: 'set_new_module_kind'; payload: { value: ModuleNode['kind'] } }
  | { type: 'set_rename_draft'; payload: { value: string } }
  | { type: 'set_connection_draft'; payload: { value: Connection } }
  | { type: 'set_decomposition_names_text'; payload: { value: string } }
  | { type: 'set_decomposition_child_kind'; payload: { value: ModuleNode['kind'] } }
  | { type: 'set_project_import_error'; payload: { message: string | null } }
  | { type: 'connect_modules'; payload: { connection: Connection; nowIso?: string } }
  | { type: 'update_selected_module_package'; payload: { updater: (current: ModulePackage) => ModulePackage; nowIso?: string } }
  | { type: 'update_module_package'; payload: { moduleId: string; updater: (current: ModulePackage) => ModulePackage; nowIso?: string } }
  | { type: 'apply_accepted_suggestion'; payload: { moduleId: string; suggestion: SuggestionCard; nowIso?: string } }
  | { type: 'update_suggestion'; payload: { moduleId: string; suggestionId: string; updater: (current: SuggestionCard) => SuggestionCard } }
  | { type: 'reject_suggestion'; payload: { moduleId: string; suggestionId: string } }
  | { type: 'set_suggestions_for_module'; payload: { moduleId: string; suggestions: SuggestionCard[] } }
  | { type: 'remove_suggestion'; payload: { moduleId: string; suggestionId: string } }
  | { type: 'move_selected_package_state_forward'; payload: { to: ModulePackage['packageStatus']; nowIso?: string } }
  | { type: 'mark_selected_module_handed_off'; payload: { nowIso?: string } }
  | { type: 'load_persisted_design_state'; payload: { state: DesignState } }
  | { type: 'replace_design_state'; payload: { state: DesignState } };
