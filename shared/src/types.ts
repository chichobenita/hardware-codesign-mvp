/**
 * Shared MVP domain types aligned with docs/architecture.
 * Keep minimal and explicit for v1.
 */

export type PackageStatus =
  | 'draft'
  | 'partially_defined'
  | 'under_review'
  | 'approved'
  | 'leaf_ready'
  | 'handed_off';

export type DecompositionStatus =
  | 'composite'
  | 'under_decomposition'
  | 'candidate_leaf'
  | 'approved_leaf';

export interface ModuleNode {
  id: string;
  name: string;
  parentId: string | null;
  childIds: string[];
  portIds: string[];
  kind: 'composite' | 'leaf' | 'undecided';
  status: 'draft' | 'refining' | 'approved' | 'leaf_ready';
}

export interface Connection {
  id: string;
  sourceModuleId: string;
  sourcePortId?: string;
  sourceInterfaceId?: string;
  targetModuleId: string;
  targetPortId?: string;
  targetInterfaceId?: string;
  description?: string;
}

export interface ModulePackage {
  packageId: string;
  moduleId: string;
  packageVersion: string;
  packageStatus: PackageStatus;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  identity?: {
    name?: string;
    description?: string;
  };
  hierarchy?: {
    parentModuleId?: string;
    childModuleIds?: string[];
    hierarchyPath?: string[];
  };
  interfaces?: {
    ports?: Array<{
      id: string;
      name: string;
      direction: 'input' | 'output' | 'inout';
      width?: string;
      description?: string;
    }>;
  };
  purpose?: {
    summary?: string;
  };
  behavior?: {
    behaviorSummary?: string;
    operationalDescription?: string;
    behaviorRules?: string[];
    clockResetNotes?: string;
  };
  constraints?: {
    timingConstraints?: string[];
    latencyConstraints?: string[];
    throughputConstraints?: string[];
    basicConstraints?: string[];
  };
  dependencies?: {
    relevantDependencies?: string[];
  };
  decompositionStatus?: {
    decompositionStatus: DecompositionStatus;
    decompositionRationale: string;
    stopReason?: string;
    stopRecommendedBy?: 'engineer' | 'system';
    furtherDecompositionNotes?: string;
  };
}

export interface GenerationPayloadMinimal {
  module_name: string;
  ports: Array<{
    name: string;
    direction: 'input' | 'output' | 'inout';
    width?: string;
    description?: string;
  }>;
  purpose: string;
  basic_constraints: string[];
  relevant_dependencies: string[];
  behavior_rules: string[];
  clock_reset_notes: string;
}
