import type { GenerationPayloadMinimal, ModulePackage, SemanticValidationIssue } from '../../../shared/src';
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
  currentPackageContent: ModulePackage;
  transitionReadiness: TransitionReadiness | null;
  moveToNextPackageState: () => void;
  currentSectionStatuses: Record<SectionKey, PackageSectionStatus>;
  updateCurrentPackage: (updater: (current: ModulePackage) => ModulePackage) => void;
  moduleConnections: Connection[];
  canShowPayloadPreview: boolean;
  generatedPayload: GenerationPayloadMinimal;
  approvedLeafReadyModules: ModuleNode[];
  selectModule: (moduleId: string) => void;
  markSelectedModuleAsHandedOff: () => void;
  isSelectedModuleHandoffReady: boolean;
  selectedModuleHandedOffAt?: string;
  moduleValidationIssues: SemanticValidationIssue[];
  designHasValidationIssues: boolean;
  isSelectedModuleValidForReviewOrHandoff: boolean;
};

export function ModulePackagePanel(props: ModulePackagePanelProps): JSX.Element {
  const {
    selectedModule,
    state,
    setWorkspaceMode,
    currentPackageContent,
    transitionReadiness,
    moveToNextPackageState,
    currentSectionStatuses,
    updateCurrentPackage,
    moduleConnections,
    canShowPayloadPreview,
    generatedPayload,
    approvedLeafReadyModules,
    selectModule,
    markSelectedModuleAsHandedOff,
    isSelectedModuleHandoffReady,
    selectedModuleHandedOffAt,
    moduleValidationIssues,
    designHasValidationIssues,
    isSelectedModuleValidForReviewOrHandoff
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
                    return (
                      <li key={moduleNode.id}>
                        <button
                          type="button"
                          className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                          onClick={() => selectModule(moduleNode.id)}
                        >
                          <span>
                            {moduleNode.name}
                            {handedOffAt ? <small className="handoff-indicator">handed_off</small> : null}
                          </span>
                          <small>{state.packageContentByModuleId[moduleNode.id]?.packageStatus}</small>
                        </button>
                        {handedOffAt ? <p className="muted">Handoff timestamp: {new Date(handedOffAt).toLocaleString()}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <button type="button" onClick={markSelectedModuleAsHandedOff} disabled={!isSelectedModuleHandoffReady || Boolean(selectedModuleHandedOffAt)}>
                {selectedModuleHandedOffAt ? 'Already handed off' : 'Mark selected module as handed_off'}
              </button>
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
