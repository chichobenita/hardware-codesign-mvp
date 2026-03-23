import type { ModuleKind, ModulePackage } from '../../../shared/src';
import type { AiProposal } from '../ai/proposals/proposalTypes';
import type { Connection, DesignState, WorkspaceMode } from '../types';
import type { HandoffArtifact } from '../ai/handoffTypes';
import type { ProviderExecutionFailure, ProviderHandoffResult } from '../ai/providers/providerTypes';
import type { ProviderJob } from '../ai/providerJobTypes';

export type DesignAction =
  | { type: 'create_module'; payload: { name: string; kind: ModuleKind; parentModuleId?: string; nextId?: string; nowIso?: string } }
  | { type: 'decompose_selected_module'; payload: { childNames: string[]; childKind: ModuleKind; nowIso?: string } }
  | { type: 'rename_module'; payload: { moduleId: string; name: string; nowIso?: string } }
  | { type: 'select_module'; payload: { moduleId: string } }
  | { type: 'set_workspace_mode'; payload: { mode: WorkspaceMode } }
  | { type: 'set_selected_provider'; payload: { providerId: string } }
  | { type: 'enter_hierarchy_view'; payload: { moduleId: string } }
  | { type: 'navigate_to_parent_hierarchy'; payload: {} }
  | { type: 'set_hierarchy_view'; payload: { moduleId: string } }
  | { type: 'set_new_module_name'; payload: { value: string } }
  | { type: 'set_new_module_kind'; payload: { value: ModuleKind } }
  | { type: 'set_rename_draft'; payload: { value: string } }
  | { type: 'set_connection_draft'; payload: { value: Connection } }
  | { type: 'set_decomposition_names_text'; payload: { value: string } }
  | { type: 'set_decomposition_child_kind'; payload: { value: ModuleKind } }
  | { type: 'set_project_import_error'; payload: { message: string | null } }
  | { type: 'connect_modules'; payload: { connection: Connection; nowIso?: string } }
  | { type: 'update_selected_module_package'; payload: { updater: (current: ModulePackage) => ModulePackage; nowIso?: string } }
  | { type: 'update_module_package'; payload: { moduleId: string; updater: (current: ModulePackage) => ModulePackage; nowIso?: string } }
  | { type: 'apply_proposal'; payload: { moduleId: string; proposal: AiProposal; nowIso?: string } }
  | { type: 'update_proposal'; payload: { moduleId: string; proposalId: string; updater: (current: AiProposal) => AiProposal } }
  | { type: 'reject_proposal'; payload: { moduleId: string; proposalId: string } }
  | { type: 'set_proposals_for_module'; payload: { moduleId: string; proposals: AiProposal[] } }
  | { type: 'remove_proposal'; payload: { moduleId: string; proposalId: string } }
  | { type: 'move_selected_package_state_forward'; payload: { to: ModulePackage['packageStatus']; nowIso?: string } }
  | { type: 'queue_handoff_artifact'; payload: { artifact: HandoffArtifact } }
  | { type: 'start_provider_job'; payload: { job: ProviderJob } }
  | { type: 'complete_provider_job_success'; payload: { jobId: string; artifactId: string; response: ProviderHandoffResult; completedAt: string } }
  | { type: 'complete_provider_job_failure'; payload: { jobId: string; artifactId: string; error: ProviderExecutionFailure; completedAt: string } }
  | { type: 'mark_selected_module_handed_off'; payload: { nowIso?: string } }
  | { type: 'load_persisted_design_state'; payload: { state: DesignState } }
  | { type: 'replace_design_state'; payload: { state: DesignState } };
