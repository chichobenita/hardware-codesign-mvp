<<<<<<< HEAD
import type { ModuleKind, ModuleNode, ModulePackage, SemanticConnection } from '../../shared/src';
import type { HandoffArtifact } from './ai/handoffTypes';
import type { AiProposal } from './ai/proposals/proposalTypes';
import type { ProviderJob } from './ai/providerJobTypes';
=======
import type { ModuleKind, ModuleNode, ModulePackage, ModulePort, SemanticConnection } from '../../shared/src';
import type { HandoffArtifact } from './ai/handoffTypes';
>>>>>>> origin/main

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

<<<<<<< HEAD
=======
export type SuggestionType = 'purpose_proposal' | 'behavior_summary' | 'ports_suggestion' | 'decomposition_suggestion';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export type SuggestionCard = {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  status: SuggestionStatus;
  draft: {
    summaryText?: string;
    ports?: ModulePort[];
    decompositionStatus?: NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'];
    decompositionRationale?: string;
  };
};

>>>>>>> origin/main
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
<<<<<<< HEAD
  proposalsByModuleId: Record<string, AiProposal[]>;
=======
  suggestionsByModuleId: Record<string, SuggestionCard[]>;
>>>>>>> origin/main
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
