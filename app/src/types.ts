import type { ModuleKind, ModuleNode, ModulePackage, SemanticConnection } from '../../shared/src';
import type { HandoffArtifact } from './ai/handoffTypes';
import type { AiProposal } from './ai/proposals/proposalTypes';
import type { ProviderJob } from './ai/providerJobTypes';

export type Connection = SemanticConnection;

export type PackageSectionStatus = 'empty' | 'partial' | 'complete' | 'needs_review';
export type SectionKey =
  | 'identity'
  | 'hierarchy'
  | 'interfaces'
  | 'purpose'
  | 'behavior'
  | 'constraints'
  | 'dependenciesAndInteractions'
  | 'decompositionStatus';

export type WorkspaceMode = 'design' | 'review' | 'handoff';
export type SecondaryWorkspace = 'none' | 'package_editor' | 'review' | 'handoff' | 'validation' | 'project_data';

export type HierarchyBreadcrumbItem = {
  moduleId: string;
  label: string;
};

export type HierarchyDecompositionDraft = {
  namesText: string;
  childKind: ModuleKind;
};

export type DesignUiState = {
  workspaceMode: WorkspaceMode;
  secondaryWorkspace: SecondaryWorkspace;
  selectedProviderId: string;
  currentHierarchyModuleId: string;
  newModuleName: string;
  newModuleKind: ModuleKind;
  renameDraft: string;
  connectionDraft: Connection;
  decompositionDraft: HierarchyDecompositionDraft;
  projectImportError: string | null;
};

export type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
  handoffArtifacts: HandoffArtifact[];
  providerJobs: ProviderJob[];
  proposalsByModuleId: Record<string, AiProposal[]>;
  ui: DesignUiState;
};

export type PersistedDesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
  handoffArtifacts: HandoffArtifact[];
};
