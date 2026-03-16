import { useMemo, useState, type ReactNode } from 'react';
import { deriveGenerationPayloadMinimalV1, type GenerationPayloadMinimal, type ModulePackage } from '../../shared/src';

type ModuleNode = {
  id: string;
  name: string;
  kind: 'composite' | 'leaf';
};

type Connection = {
  fromModuleId: string;
  toModuleId: string;
  signal: string;
};

type PackageSectionStatus = 'empty' | 'partial' | 'complete' | 'needs_review';
type SectionKey =
  | 'identity'
  | 'hierarchy'
  | 'interfaces'
  | 'purpose'
  | 'behavior'
  | 'constraints'
  | 'dependenciesAndInteractions'
  | 'decompositionStatus';

type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
};

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyList(values: string[]): string {
  return values.join(', ');
}

function listStatus(values: string[]): Exclude<PackageSectionStatus, 'needs_review'> {
  if (values.length === 0) {
    return 'empty';
  }

  const filled = values.filter((value) => value.trim().length > 0).length;
  if (filled === 0) {
    return 'empty';
  }
  if (filled === values.length) {
    return 'complete';
  }
  return 'partial';
}

function markNeedsReview(baseStatus: Exclude<PackageSectionStatus, 'needs_review'>, shouldMarkReview: boolean): PackageSectionStatus {
  if (!shouldMarkReview || baseStatus === 'empty') {
    return baseStatus;
  }
  return 'needs_review';
}

function sectionStatuses(modulePackage: ModulePackage): Record<SectionKey, PackageSectionStatus> {
  const reviewMode = modulePackage.packageStatus === 'under_review';

  const interfaceValues = (modulePackage.interfaces?.ports ?? []).flatMap((port) => [port.name ?? '', port.direction ?? '', port.width ?? '']);
  const behaviorValues = [
    modulePackage.behavior?.behaviorSummary ?? '',
    modulePackage.behavior?.operationalDescription ?? '',
    modulePackage.behavior?.clockResetNotes ?? '',
    ...(modulePackage.behavior?.behaviorRules ?? [])
  ];
  const constraintValues = [
    ...(modulePackage.constraints?.timingConstraints ?? []),
    ...(modulePackage.constraints?.latencyConstraints ?? []),
    ...(modulePackage.constraints?.throughputConstraints ?? []),
    ...(modulePackage.constraints?.basicConstraints ?? [])
  ];

  return {
    identity: markNeedsReview(listStatus([modulePackage.identity?.name ?? '', modulePackage.identity?.description ?? '']), reviewMode),
    hierarchy: markNeedsReview(
      listStatus([
        modulePackage.hierarchy?.parentModuleId ?? '',
        ...(modulePackage.hierarchy?.childModuleIds ?? []),
        ...(modulePackage.hierarchy?.hierarchyPath ?? [])
      ]),
      reviewMode
    ),
    interfaces: markNeedsReview(listStatus(interfaceValues), reviewMode),
    purpose: markNeedsReview(listStatus([modulePackage.purpose?.summary ?? '']), reviewMode),
    behavior: markNeedsReview(listStatus(behaviorValues), reviewMode),
    constraints: markNeedsReview(listStatus(constraintValues), reviewMode),
    dependenciesAndInteractions: markNeedsReview(listStatus(modulePackage.dependencies?.relevantDependencies ?? []), reviewMode),
    decompositionStatus: markNeedsReview(
      listStatus([
        modulePackage.decompositionStatus?.decompositionStatus ?? '',
        modulePackage.decompositionStatus?.decompositionRationale ?? '',
        modulePackage.decompositionStatus?.stopReason ?? '',
        modulePackage.decompositionStatus?.furtherDecompositionNotes ?? ''
      ]),
      reviewMode
    )
  };
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

const seedState: DesignState = {
  moduleList: [
    { id: 'root', name: 'top_controller', kind: 'composite' },
    { id: 'child_a', name: 'input_fifo', kind: 'leaf' },
    { id: 'child_b', name: 'scheduler', kind: 'leaf' },
    { id: 'example_uart_rx', name: 'uart_rx', kind: 'leaf' }
  ],
  selectedModuleId: 'example_uart_rx',
  connections: [
    { fromModuleId: 'child_a', toModuleId: 'root', signal: 'fifo_out' },
    { fromModuleId: 'root', toModuleId: 'child_b', signal: 'dispatch_cmd' },
    { fromModuleId: 'example_uart_rx', toModuleId: 'root', signal: 'uart_data_byte' }
  ],
  packageContentByModuleId: {
    root: {
      packageId: 'pkg_root',
      moduleId: 'root',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'top_controller', description: 'Top-level orchestrator for subsystem coordination.' },
      hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b'], hierarchyPath: ['top_controller'] },
      interfaces: { ports: [{ id: 'cfg_bus', name: 'cfg_bus', direction: 'input', width: '32' }, { id: 'data_out', name: 'data_out', direction: 'output', width: '32' }] },
      purpose: { summary: 'Coordinates data flow and control decisions.' },
      decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: 'Still splitting control and data scheduling.', furtherDecompositionNotes: 'Need one more refinement pass.' }
    },
    child_a: {
      packageId: 'pkg_child_a',
      moduleId: 'child_a',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'input_fifo' },
      interfaces: { ports: [{ id: 'data_in', name: 'data_in', direction: 'input' }, { id: 'fifo_out', name: 'fifo_out', direction: 'output' }] },
      purpose: { summary: '' }
    },
    child_b: {
      packageId: 'pkg_child_b',
      moduleId: 'child_b',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'scheduler' },
      interfaces: { ports: [] },
      purpose: { summary: '' }
    },
    example_uart_rx: {
      packageId: 'pkg_example_uart_rx',
      moduleId: 'example_uart_rx',
      packageVersion: '0.1.0',
      packageStatus: 'partially_defined',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'uart_rx', description: 'UART receiver converting serial stream to bytes.' },
      hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'uart_rx'] },
      interfaces: {
        ports: [
          { id: 'clk', name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: 'rst_n', name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: 'rx_i', name: 'rx_i', direction: 'input', width: '1', description: 'UART serial input' },
          { id: 'data_o', name: 'data_o', direction: 'output', width: '8', description: 'Received byte' }
        ]
      },
      purpose: { summary: 'Receives UART serial data and emits decoded bytes.' },
      constraints: { basicConstraints: ['115200 baud nominal', '8-N-1 format'] },
      dependencies: { relevantDependencies: ['system clock', 'upstream UART TX timing assumptions'] },
      behavior: {
        behaviorSummary: 'Detect start bit, sample 8 data bits, emit output byte.',
        behaviorRules: ['Sample start bit midpoint before data bits', 'Assert data_o only after a full valid frame'],
        clockResetNotes: 'Synchronous to clk. rst_n clears RX state machine and output valid flags.'
      },
      decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'Simple block with clear fixed behavior.', stopRecommendedBy: 'system' }
    }
  }
};

export function App(): JSX.Element {
  const [state, setState] = useState<DesignState>(seedState);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleKind, setNewModuleKind] = useState<ModuleNode['kind']>('leaf');
  const [connectionDraft, setConnectionDraft] = useState<Connection>({
    fromModuleId: seedState.moduleList[0].id,
    toModuleId: seedState.moduleList[1].id,
    signal: ''
  });

  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId) ?? state.moduleList[0];
  const currentPackageContent = state.packageContentByModuleId[state.selectedModuleId];
  const currentSectionStatuses = useMemo(() => sectionStatuses(currentPackageContent), [currentPackageContent]);
  const moduleConnections = state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId);
  const generatedPayload: GenerationPayloadMinimal = useMemo(() => deriveGenerationPayloadMinimalV1(currentPackageContent), [currentPackageContent]);

  const updateCurrentPackage = (updater: (current: ModulePackage) => ModulePackage) => {
    setState((current) => {
      const currentPackage = current.packageContentByModuleId[current.selectedModuleId];
      const nextPackage = {
        ...updater(currentPackage),
        moduleId: current.selectedModuleId,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'mock_user'
      };

      return {
        ...current,
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: nextPackage
        },
        moduleList: current.moduleList.map((moduleNode) =>
          moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: nextPackage.identity?.name || 'unnamed_module' } : moduleNode
        )
      };
    });
  };

  const applyMockSuggestion = () => {
    updateCurrentPackage((current) => ({
      ...current,
      packageStatus: 'under_review',
      purpose: { ...current.purpose, summary: 'AI suggestion: clarify module behavior and key constraints in one sentence.' }
    }));
  };

  const createModule = () => {
    const cleanName = newModuleName.trim() || 'unnamed_module';
    const nextId = `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
    const newPackage: ModulePackage = {
      packageId: `pkg_${nextId}`,
      moduleId: nextId,
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: cleanName },
      hierarchy: { parentModuleId: '', childModuleIds: [], hierarchyPath: [cleanName] },
      interfaces: { ports: [] },
      purpose: { summary: '' },
      constraints: { basicConstraints: [] },
      dependencies: { relevantDependencies: [] },
      behavior: { behaviorRules: [], clockResetNotes: '' },
      decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
    };

    setState((current) => ({
      ...current,
      moduleList: [...current.moduleList, { id: nextId, name: cleanName, kind: newModuleKind }],
      selectedModuleId: nextId,
      packageContentByModuleId: { ...current.packageContentByModuleId, [nextId]: newPackage }
    }));

    setConnectionDraft((current) => ({ ...current, toModuleId: nextId }));
  };

  const addConnection = () => {
    if (!connectionDraft.fromModuleId || !connectionDraft.toModuleId || !connectionDraft.signal.trim()) {
      return;
    }
    setState((current) => ({ ...current, connections: [...current.connections, { ...connectionDraft, signal: connectionDraft.signal.trim() }] }));
  };

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP — Main Workspace</header>
      <main className="workspace-grid">
        <section className="panel left-panel">
          <h2>AI Collaboration</h2>
          <p className="muted">Mock panel only. No real AI integration in v1.</p>
          <div className="chat-bubble">Suggestion: add a clearer purpose statement for the selected module.</div>
          <button type="button" onClick={applyMockSuggestion}>Apply suggestion</button>
        </section>

        <section className="panel center-panel">
          <h2>Diagram Workspace</h2>
          <p className="muted">Basic interactions: create, select, and connect blocks.</p>
          <div className="inline-form">
            <input value={newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" />
            <select value={newModuleKind} onChange={(event) => setNewModuleKind(event.target.value as ModuleNode['kind'])} aria-label="Block kind">
              <option value="leaf">leaf</option>
              <option value="composite">composite</option>
            </select>
            <button type="button" onClick={createModule}>Create block</button>
          </div>
          <ul className="module-list">
            {state.moduleList.map((moduleNode) => (
              <li key={moduleNode.id}>
                <button
                  type="button"
                  className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                  onClick={() => setState((current) => ({ ...current, selectedModuleId: moduleNode.id }))}
                >
                  <span>{moduleNode.name}</span>
                  <small>{moduleNode.kind}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="connection-builder">
            <strong>Connect blocks</strong>
            <div className="inline-form">
              <select value={connectionDraft.fromModuleId} onChange={(event) => setConnectionDraft((current) => ({ ...current, fromModuleId: event.target.value }))} aria-label="Connection source">
                {state.moduleList.map((moduleNode) => (
                  <option key={`from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                ))}
              </select>
              <select value={connectionDraft.toModuleId} onChange={(event) => setConnectionDraft((current) => ({ ...current, toModuleId: event.target.value }))} aria-label="Connection target">
                {state.moduleList.map((moduleNode) => (
                  <option key={`to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                ))}
              </select>
              <input value={connectionDraft.signal} onChange={(event) => setConnectionDraft((current) => ({ ...current, signal: event.target.value }))} placeholder="signal" />
              <button type="button" onClick={addConnection}>Connect</button>
            </div>
          </div>
        </section>

        <section className="panel right-panel">
          <h2>Module Package</h2>
          <p className="muted">Selected module: {selectedModule?.name} ({state.selectedModuleId})</p>

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

          <div className="payload-preview">
            <strong>GenerationPayloadMinimal v1 (derived)</strong>
            <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}

type ModulePackageSectionProps = {
  title: string;
  status: PackageSectionStatus;
  children: ReactNode;
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


export default App;
