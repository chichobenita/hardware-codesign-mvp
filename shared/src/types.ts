/**
 * Shared MVP domain types aligned with docs/architecture.
 * Keep minimal and explicit for v1.
 */

export type ModuleKind = 'composite' | 'leaf';
export type PortDirection = 'input' | 'output' | 'inout';

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
  kind: ModuleKind;
}

export interface SemanticConnection {
  fromModuleId: string;
  toModuleId: string;
  signal: string;
}

export interface ModuleDependencyLink {
  direction: 'upstream' | 'downstream';
  moduleId: string;
  signal?: string;
}

export interface ModuleIdentity {
  name?: string;
  description?: string;
}

export interface ModuleHierarchy {
  parentModuleId?: string;
  childModuleIds?: string[];
  hierarchyPath?: string[];
}

export interface ModulePort {
  id: string;
  name: string;
  direction: PortDirection;
  width?: string;
  description?: string;
}

export interface ModuleInterfaces {
  ports?: ModulePort[];
  interfaceNotes?: string;
}

export interface ModulePurpose {
  summary?: string;
}

export interface ModuleBehavior {
  behaviorSummary?: string;
  operationalDescription?: string;
  behaviorRules?: string[];
  clockResetNotes?: string;
  cornerCases?: string[];
  implementationNotes?: string[];
}

export interface ModuleConstraints {
  timingConstraints?: string[];
  latencyConstraints?: string[];
  throughputConstraints?: string[];
  basicConstraints?: string[];
}

export interface ModuleDependencies {
  /**
   * Structured dependency links are the preferred semantic representation in MVP.
   * These should be updated from deterministic app actions (e.g. connect modules).
   */
  links?: ModuleDependencyLink[];
  /**
   * Human-readable dependency notes kept for UI editing and payload output.
   * Entries prefixed with upstream:/downstream: may be synchronized from links.
   */
  relevantDependencies?: string[];
  integrationAssumptions?: string[];
}

export interface ModuleDecomposition {
  decompositionStatus: DecompositionStatus;
  decompositionRationale: string;
  stopReason?: string;
  stopRecommendedBy?: 'engineer' | 'system';
  furtherDecompositionNotes?: string;
}

export interface ModulePackage {
  packageId: string;
  moduleId: string;
  packageVersion: string;
  packageStatus: PackageStatus;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  identity?: ModuleIdentity;
  hierarchy?: ModuleHierarchy;
  interfaces?: ModuleInterfaces;
  purpose?: ModulePurpose;
  behavior?: ModuleBehavior;
  constraints?: ModuleConstraints;
  dependencies?: ModuleDependencies;
  decompositionStatus?: ModuleDecomposition;
}

export interface GenerationPayloadMinimal {
  module_name: string;
  ports: Array<{
    name: string;
    direction: PortDirection;
    width?: string;
    description?: string;
  }>;
  purpose: string;
  basic_constraints: string[];
  relevant_dependencies: string[];
  behavior_rules: string[];
  clock_reset_notes: string;
}

export interface SemanticDesignSnapshot {
  moduleIds: string[];
  packageContentByModuleId: Record<string, ModulePackage>;
  connections: SemanticConnection[];
}
