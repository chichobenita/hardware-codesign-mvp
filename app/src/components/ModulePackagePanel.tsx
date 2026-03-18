import type { GenerationPayloadMinimal, ModulePackage, SemanticValidationIssue } from '../../../shared/src';
import type { HandoffArtifact } from '../ai/handoffTypes';
import type { HandoffProvider } from '../ai/providers/providerTypes';
import type { PromptBuildResult } from '../ai/promptTypes';
import { getTransitionActionLabel, type TransitionReadiness } from '../packageLifecycle';
import type { Connection, DesignState, ModuleNode, PackageSectionStatus, SectionKey, WorkspaceMode } from '../types';

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyList(values: string[]): string {
  return values.join(', ');
}

function portsForDirection(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout'): string[] {
  return (modulePackage.interfaces?.ports ?? []).filter((port) => port.direction === direction).map((port) => port.name);
}

function replaceDirectionPorts(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout', names: string[]): ModulePackage {
  const existingPorts = modulePackage.interfaces?.ports ?? [];
  const untouched = existingPorts.filter((port) => port.direction !== direction);
  const nextDirectionPorts = names.map((name, index) => ({
    id: `${direction}_${index}`,
    name,
    direction,
    width: '1',
    description: ''
  }));

  return {
    ...modulePackage,
    interfaces: {
      ...modulePackage.interfaces,
      ports: [...untouched, ...nextDirectionPorts]
    }
  };
}

type ModulePackagePanelProps = {
  selectedModule?: ModuleNode;
  state: DesignState;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  handoffProviders: HandoffProvider[];
  selectedProviderId: string;
  setSelectedProvider: (providerId: string) => void;
  currentPackageContent: ModulePackage;
  transitionReadiness: TransitionReadiness | null;
  moveToNextPackageState: () => void;
  currentSectionStatuses: Record<SectionKey, PackageSectionStatus>;
  updateCurrentPackage: (updater: (current: ModulePackage) => ModulePackage) => void;
  moduleConnections: Connection[];
  canShowPayloadPreview: boolean;
  generatedPayload: GenerationPayloadMinimal;
  generatedPrompt: PromptBuildResult | null;
  handoffArtifacts: HandoffArtifact[];
  latestHandoffArtifact: HandoffArtifact | null;
  copyGeneratedPrompt: () => Promise<void>;
  exportGeneratedPrompt: () => void;
  exportLatestHandoffArtifact: () => void;
  approvedLeafReadyModules: ModuleNode[];
  selectModule: (moduleId: string) => void;
  markSelectedModuleAsHandedOff: () => void;
  exportCurrentProject: () => void;
  importProjectFromFile: (file: File | null) => Promise<void>;
  isSelectedModuleHandoffReady: boolean;
  hasCurrentSelectedArtifact: boolean;
  moduleValidationIssues: SemanticValidationIssue[];
  designHasValidationIssues: boolean;
  isSelectedModuleValidForReviewOrHandoff: boolean;
  currentHierarchyModule?: ModuleNode;
  decompositionDraftNamesText: string;
  decompositionDraftChildKind: ModuleNode['kind'];
  setDecompositionNamesText: (value: string) => void;
  setDecompositionChildKind: (value: ModuleNode['kind']) => void;
  decomposeSelectedModule: () => void;
};

export function ModulePackagePanel(props: ModulePackagePanelProps): JSX.Element {
  const {
    selectedModule,
    state,
    setWorkspaceMode,
    handoffProviders,
    selectedProviderId,
    setSelectedProvider,
    currentPackageContent,
    transitionReadiness,
    moveToNextPackageState,
    currentSectionStatuses,
    updateCurrentPackage,
    moduleConnections,
    canShowPayloadPreview,
    generatedPayload,
    generatedPrompt,
    handoffArtifacts,
    latestHandoffArtifact,
    copyGeneratedPrompt,
    exportGeneratedPrompt,
    exportLatestHandoffArtifact,
    approvedLeafReadyModules,
    selectModule,
    markSelectedModuleAsHandedOff,
    exportCurrentProject,
    importProjectFromFile,
    isSelectedModuleHandoffReady,
    hasCurrentSelectedArtifact,
    moduleValidationIssues,
    designHasValidationIssues,
    isSelectedModuleValidForReviewOrHandoff,
    currentHierarchyModule,
    decompositionDraftNamesText,
    decompositionDraftChildKind,
    setDecompositionNamesText,
    setDecompositionChildKind,
    decomposeSelectedModule
  } = props;

  return (
        <section className="panel right-panel">
          <h2>Module Package</h2>
          <p className="muted">Selected module: {selectedModule?.name} ({state.selectedModuleId})</p>
          <label>
            Workspace mode
            <select value={state.ui.workspaceMode} onChange={(event) => setWorkspaceMode(event.target.value as WorkspaceMode)} aria-label="Workspace mode">
              <option value="design">design</option>
              <option value="review">review</option>
              <option value="handoff">handoff</option>
            </select>
          </label>
          <label>
            Handoff provider
            <select value={selectedProviderId} onChange={(event) => setSelectedProvider(event.target.value)} aria-label="Handoff provider">
              {handoffProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.label}</option>
              ))}
            </select>
          </label>
          <p className="muted">
            {handoffProviders.find((provider) => provider.id === selectedProviderId)?.description ?? 'Frontend-local mock provider.'}
          </p>


          <section className="project-transfer-card">
            <h3>Project JSON</h3>
            <p className="muted">Export or restore the full MVP project snapshot.</p>
            <div className="project-transfer-actions">
              <button type="button" onClick={exportCurrentProject}>Export project JSON</button>
              <label className="button-like file-upload-button">
                Import project JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    await importProjectFromFile(event.target.files?.[0] ?? null);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            {state.ui.projectImportError ? <p className="import-error">{state.ui.projectImportError}</p> : null}
          </section>

          <section className="lifecycle-card">
            <h3>Package lifecycle</h3>
            <p className="muted">Current state: <strong>{currentPackageContent.packageStatus}</strong></p>
            {transitionReadiness ? (
              <>
                <p className="muted">Next transition: {transitionReadiness.title}</p>
                {transitionReadiness.canTransition ? (
                  <p className="ready-message">Ready to transition.</p>
                ) : (
                  <div className="missing-list">
                    <strong>Missing before transition:</strong>
                    <ul>
                      {transitionReadiness.missingRequirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" onClick={moveToNextPackageState} disabled={!transitionReadiness.canTransition}>
                  {getTransitionActionLabel(transitionReadiness.to)}
                </button>
              </>
            ) : (
              <p className="ready-message">No further transitions in MVP flow.</p>
            )}
          </section>




          <section className="lifecycle-card">
            <h3>Hierarchy workflow</h3>
            <p className="muted">Current view scope: <strong>{currentHierarchyModule?.name ?? 'workspace'}</strong></p>
            <p className="muted">Selected module stays store-synchronized with the active hierarchy scope.</p>
            <div className="inline-form hierarchy-decompose-form">
              <textarea
                value={decompositionDraftNamesText}
                onChange={(event) => setDecompositionNamesText(event.target.value)}
                rows={2}
                placeholder="child names, comma-separated"
              />
              <select
                value={decompositionDraftChildKind}
                onChange={(event) => setDecompositionChildKind(event.target.value as ModuleNode['kind'])}
                aria-label="Decomposition child kind"
              >
                <option value="leaf">leaf children</option>
                <option value="composite">composite children</option>
              </select>
              <button type="button" onClick={decomposeSelectedModule}>Decompose selected module</button>
            </div>
          </section>

          <section className="validation-card">
            <h3>Semantic validation</h3>
            <p className="muted">Design validation status: <strong>{designHasValidationIssues ? 'issues found' : 'clean'}</strong></p>
            {moduleValidationIssues.length === 0 ? (
              <p className="ready-message">No semantic issues for selected module.</p>
            ) : (
              <ul className="validation-list">
                {moduleValidationIssues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`} className={`validation-issue validation-${issue.severity}`}>
                    <strong>{issue.severity.toUpperCase()}</strong> — {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ModulePackageSection title="Identity" status={currentSectionStatuses.identity}>
            <label>
              Name
              <input value={currentPackageContent.identity?.name ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, name: event.target.value } }))} placeholder="module name" />
            </label>
            <label>
              Description
              <textarea value={currentPackageContent.identity?.description ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, description: event.target.value } }))} rows={2} placeholder="short identity description" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Hierarchy" status={currentSectionStatuses.hierarchy}>
            <label>
              Parent module id
              <input value={currentPackageContent.hierarchy?.parentModuleId ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, parentModuleId: event.target.value } }))} placeholder="root" />
            </label>
            <label>
              Child module ids (comma-separated)
              <input value={stringifyList(currentPackageContent.hierarchy?.childModuleIds ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, childModuleIds: parseList(event.target.value) } }))} placeholder="child_a, child_b" />
            </label>
            <label>
              Hierarchy path (comma-separated)
              <input value={stringifyList(currentPackageContent.hierarchy?.hierarchyPath ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, hierarchyPath: parseList(event.target.value) } }))} placeholder="top_controller, module_name" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Interfaces" status={currentSectionStatuses.interfaces}>
            <label>
              Input ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'input'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'input', parseList(event.target.value)))} placeholder="in_a, in_b" />
            </label>
            <label>
              Output ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'output'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'output', parseList(event.target.value)))} placeholder="out_a, out_b" />
            </label>
            <label>
              Inout ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'inout'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'inout', parseList(event.target.value)))} placeholder="io_bus" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Purpose" status={currentSectionStatuses.purpose}>
            <label>
              Purpose summary
              <textarea value={currentPackageContent.purpose?.summary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, purpose: { ...current.purpose, summary: event.target.value } }))} rows={3} placeholder="what does this module do?" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Behavior" status={currentSectionStatuses.behavior}>
            <label>
              Behavior summary
              <textarea value={currentPackageContent.behavior?.behaviorSummary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorSummary: event.target.value } }))} rows={2} placeholder="high-level behavior" />
            </label>
            <label>
              Behavior rules (comma-separated)
              <input value={stringifyList(currentPackageContent.behavior?.behaviorRules ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorRules: parseList(event.target.value) } }))} placeholder="rule_a, rule_b" />
            </label>
            <label>
              Clock / reset notes
              <textarea value={currentPackageContent.behavior?.clockResetNotes ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, clockResetNotes: event.target.value } }))} rows={2} placeholder="clock and reset behavior" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Constraints" status={currentSectionStatuses.constraints}>
            <label>
              Basic constraints (comma-separated)
              <input value={stringifyList(currentPackageContent.constraints?.basicConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, basicConstraints: parseList(event.target.value) } }))} placeholder="constraint_a, constraint_b" />
            </label>
            <label>
              Timing constraints (comma-separated)
              <input value={stringifyList(currentPackageContent.constraints?.timingConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, timingConstraints: parseList(event.target.value) } }))} placeholder="setup < 2ns" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Dependencies and Interactions" status={currentSectionStatuses.dependenciesAndInteractions}>
            <label>
              Relevant dependencies (comma-separated)
              <input value={stringifyList(currentPackageContent.dependencies?.relevantDependencies ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, dependencies: { ...current.dependencies, relevantDependencies: parseList(event.target.value) } }))} placeholder="system clock, upstream block" />
            </label>
            <div className="connection-list">
              <strong>Current interactions from connections</strong>
              {moduleConnections.length === 0 ? <p className="muted">No connections for this module.</p> : (
                <ul>
                  {moduleConnections.map((connection, index) => (
                    <li key={`${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`}>{connection.fromModuleId} → {connection.toModuleId} ({connection.signal})</li>
                  ))}
                </ul>
              )}
            </div>
          </ModulePackageSection>

          <ModulePackageSection title="Decomposition Status" status={currentSectionStatuses.decompositionStatus}>
            <label>
              Decomposition status
              <select
                value={currentPackageContent.decompositionStatus?.decompositionStatus ?? 'under_decomposition'}
                onChange={(event) =>
                  updateCurrentPackage((current) => ({
                    ...current,
                    decompositionStatus: {
                      decompositionStatus: event.target.value as NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'],
                      decompositionRationale: current.decompositionStatus?.decompositionRationale ?? '',
                      stopReason: current.decompositionStatus?.stopReason,
                      stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
                      furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
                    }
                  }))
                }
              >
                <option value="composite">composite</option>
                <option value="under_decomposition">under_decomposition</option>
                <option value="candidate_leaf">candidate_leaf</option>
                <option value="approved_leaf">approved_leaf</option>
              </select>
            </label>
            <label>
              Rationale
              <textarea value={currentPackageContent.decompositionStatus?.decompositionRationale ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, decompositionStatus: { decompositionStatus: current.decompositionStatus?.decompositionStatus ?? 'under_decomposition', decompositionRationale: event.target.value, stopReason: current.decompositionStatus?.stopReason, stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy, furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes } }))} rows={2} placeholder="why this decomposition state?" />
            </label>
          </ModulePackageSection>

          {(state.ui.workspaceMode === 'review' || state.ui.workspaceMode === 'handoff') && (
            <>
              <section className="payload-preview">
                <strong>GenerationPayloadMinimal v1 preview (derived)</strong>
                {canShowPayloadPreview && isSelectedModuleValidForReviewOrHandoff ? (
                  <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
                ) : (
                  <p className="muted">
                    Payload preview is available only for semantically valid approved leaf-ready modules.
                    Resolve semantic errors, ensure this module is a leaf, set decomposition to approved_leaf, and transition package status to leaf_ready.
                  </p>
                )}
              </section>

              <section className="payload-preview">
                <strong>HDL generation prompt preview (derived)</strong>
                <p className="muted">Structured handoff prompt for a downstream AI code engine.</p>
                {canShowPayloadPreview && isSelectedModuleValidForReviewOrHandoff && generatedPrompt ? (
                  <>
                    <div className="artifact-actions">
                      <button type="button" onClick={() => { void copyGeneratedPrompt(); }}>Copy generated prompt</button>
                      <button type="button" onClick={exportGeneratedPrompt}>Export prompt</button>
                    </div>
                    <pre>{generatedPrompt.promptText}</pre>
                  </>
                ) : (
                  <p className="muted">
                    Prompt preview follows the same readiness gate as the payload preview so review and handoff stay aligned.
                  </p>
                )}
              </section>
            </>
          )}

          {state.ui.workspaceMode === 'handoff' && (
            <section className="handoff-card">
              <h3>Handoff / Export</h3>
              <p className="muted">Approved leaf-ready modules</p>
              {approvedLeafReadyModules.length === 0 ? (
                <p className="muted">No modules are ready for handoff yet.</p>
              ) : (
                <ul className="handoff-list">
                  {approvedLeafReadyModules.map((moduleNode) => {
                    const handedOffAt = state.handedOffAtByModuleId[moduleNode.id];
                    const latestModuleArtifact = state.handoffArtifacts.find((artifact) => artifact.moduleId === moduleNode.id);
                    return (
                      <li key={moduleNode.id}>
                        <button
                          type="button"
                          className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                          onClick={() => selectModule(moduleNode.id)}
                        >
                          <span>
                            {moduleNode.name}
                            {latestModuleArtifact ? <small className="handoff-indicator">{latestModuleArtifact.handoffStatus}</small> : null}
                          </span>
                          <small>{state.packageContentByModuleId[moduleNode.id]?.packageStatus}</small>
                        </button>
                        {handedOffAt ? <p className="muted">Handoff timestamp: {new Date(handedOffAt).toLocaleString()}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <button type="button" onClick={markSelectedModuleAsHandedOff} disabled={!isSelectedModuleHandoffReady || hasCurrentSelectedArtifact}>
                {hasCurrentSelectedArtifact
                  ? 'Already handed off'
                  : latestHandoffArtifact?.handoffStatus === 'stale'
                    ? 'Create refreshed handoff artifact'
                    : 'Mark selected module as handed_off'}
              </button>

              <section className="payload-preview">
                <strong>Handoff artifact preview</strong>
                <p className="muted">Concrete handoff record built from the derived payload and prompt snapshots.</p>
                {latestHandoffArtifact ? (
                  <>
                    <p className="muted">
                      Current artifact status: <strong>{latestHandoffArtifact.handoffStatus}</strong>
                      {latestHandoffArtifact.handoffStatus === 'stale' ? ' — module handoff inputs changed after this artifact was created.' : ''}
                    </p>
                    <div className="artifact-actions">
                      <button type="button" onClick={exportLatestHandoffArtifact}>Export handoff artifact</button>
                    </div>
                    <pre>{JSON.stringify(latestHandoffArtifact, null, 2)}</pre>
                  </>
                ) : (
                  <p className="muted">No handoff artifact created for the selected module yet.</p>
                )}
              </section>

              <section className="handoff-history">
                <strong>Local handoff history</strong>
                {handoffArtifacts.length === 0 ? (
                  <p className="muted">No local handoff records for this module yet.</p>
                ) : (
                  <ul className="handoff-list">
                    {handoffArtifacts.map((artifact) => (
                      <li key={artifact.artifactId}>
                        <span>{artifact.createdAt}</span>
                        <small>{artifact.targetProviderId} · {artifact.handoffStatus}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>
          )}
        </section>
  );
}

type ModulePackageSectionProps = {
  title: string;
  status: PackageSectionStatus;
  children: React.ReactNode;
};

function ModulePackageSection({ title, status, children }: ModulePackageSectionProps): JSX.Element {
  return (
    <section className="module-package-section">
      <div className="section-header-row">
        <h3>{title}</h3>
        <StatusBadge label="status" status={status} />
      </div>
      <div>{children}</div>
    </section>
  );
}

type StatusBadgeProps = {
  label: string;
  status: PackageSectionStatus;
};

function StatusBadge({ label, status }: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-${status}`}>{label}: {status}</span>;
}
