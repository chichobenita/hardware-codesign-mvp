import type { ModulePackage, SemanticConnection } from '../../shared/src';

export type ModuleNode = {
  id: string;
  /**
   * Denormalized projection for list rendering.
   * Authoritative identity is ModulePackage.identity.name.
   */
  name: string;
  kind: 'composite' | 'leaf';
};

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

export type SuggestionType = 'purpose_proposal' | 'behavior_summary' | 'ports_suggestion' | 'decomposition_suggestion';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';
export type PortDraft = NonNullable<NonNullable<ModulePackage['interfaces']>['ports']>[number];

export type SuggestionCard = {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  status: SuggestionStatus;
  draft: {
    summaryText?: string;
    ports?: PortDraft[];
    decompositionStatus?: NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'];
    decompositionRationale?: string;
  };
};

export type DesignUiState = {
  workspaceMode: WorkspaceMode;
  newModuleName: string;
  newModuleKind: ModuleNode['kind'];
  renameDraft: string;
  connectionDraft: Connection;
};

export type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
  suggestionsByModuleId: Record<string, SuggestionCard[]>;
  ui: DesignUiState;
};

export type PersistedDesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
};
