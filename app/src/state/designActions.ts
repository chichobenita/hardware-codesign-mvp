import type { ModulePackage } from '../../../shared/src';
import type { Connection, DesignState, ModuleNode, SuggestionCard } from '../types';

export type DesignAction =
  | { type: 'create_module'; payload: { name: string; kind: ModuleNode['kind']; nextId?: string; nowIso?: string } }
  | { type: 'rename_module'; payload: { moduleId: string; name: string; nowIso?: string } }
  | { type: 'select_module'; payload: { moduleId: string } }
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
