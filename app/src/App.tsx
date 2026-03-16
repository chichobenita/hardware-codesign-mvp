import { useMemo, useState } from 'react';
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

type PackageSectionStatus = 'empty' | 'partial' | 'complete';

type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  packageStatusByModuleId: Record<string, Record<'identity' | 'purpose' | 'interfaces', PackageSectionStatus>>;
};

function sectionStatus(values: string[]): PackageSectionStatus {
  const filled = values.filter((value) => value.trim().length > 0).length;
  if (filled === 0) {
    return 'empty';
  }
  if (filled === values.length) {
    return 'complete';
  }
  return 'partial';
}

function statusForPackage(modulePackage: ModulePackage): Record<'identity' | 'purpose' | 'interfaces', PackageSectionStatus> {
  return {
    identity: sectionStatus([modulePackage.identity?.name ?? '']),
    purpose: sectionStatus([modulePackage.purpose?.summary ?? '']),
    interfaces: sectionStatus((modulePackage.interfaces?.ports ?? []).map((port) => port.name))
  };
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyList(values: string[]): string {
  return values.join(', ');
}

function portsForDirection(modulePackage: ModulePackage, direction: 'input' | 'output'): string[] {
  return (modulePackage.interfaces?.ports ?? []).filter((port) => port.direction === direction).map((port) => port.name);
}

function replaceDirectionPorts(modulePackage: ModulePackage, direction: 'input' | 'output', names: string[]): ModulePackage {
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
      identity: { name: 'top_controller' },
      interfaces: { ports: [{ id: 'cfg_bus', name: 'cfg_bus', direction: 'input', width: '32' }, { id: 'data_out', name: 'data_out', direction: 'output', width: '32' }] },
      purpose: { summary: 'Coordinates data flow and control decisions.' }
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
      identity: { name: 'uart_rx' },
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
        behaviorRules: ['Sample start bit midpoint before data bits', 'Assert data_o only after a full valid frame'],
        clockResetNotes: 'Synchronous to clk. rst_n clears RX state machine and output valid flags.'
      }
    }
  },
  packageStatusByModuleId: {
    root: { identity: 'complete', purpose: 'complete', interfaces: 'complete' },
    child_a: { identity: 'complete', purpose: 'empty', interfaces: 'complete' },
    child_b: { identity: 'complete', purpose: 'empty', interfaces: 'empty' },
    example_uart_rx: { identity: 'complete', purpose: 'complete', interfaces: 'complete' }
  }
};

export function App(): JSX.Element {
  const [state, setState] = useState<DesignState>(seedState);
  const [newModuleName, setNewModuleName] = useState('new_module');
  const [newModuleKind, setNewModuleKind] = useState<ModuleNode['kind']>('leaf');
  const [connectionDraft, setConnectionDraft] = useState<Connection>({ fromModuleId: 'root', toModuleId: 'child_a', signal: 'signal_name' });

  const currentPackageContent = state.packageContentByModuleId[state.selectedModuleId];
  const currentPackageStatus = state.packageStatusByModuleId[state.selectedModuleId];
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);

  const generatedPayload = useMemo<GenerationPayloadMinimal>(
    () => deriveGenerationPayloadMinimalV1(currentPackageContent),
    [currentPackageContent]
  );

  const moduleConnections = useMemo(
    () => state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId),
    [state.connections, state.selectedModuleId]
  );

  const updateCurrentPackage = (transform: (current: ModulePackage) => ModulePackage) => {
    setState((current) => {
      const nextPackage = transform(current.packageContentByModuleId[current.selectedModuleId]);
      return {
        ...current,
        packageContentByModuleId: { ...current.packageContentByModuleId, [current.selectedModuleId]: nextPackage },
        packageStatusByModuleId: { ...current.packageStatusByModuleId, [current.selectedModuleId]: statusForPackage(nextPackage) },
        moduleList: current.moduleList.map((moduleNode) =>
          moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: nextPackage.identity?.name || 'unnamed_module' } : moduleNode
        )
      };
    });
  };

  const applyMockSuggestion = () => {
    updateCurrentPackage((current) => ({
      ...current,
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
      interfaces: { ports: [] },
      purpose: { summary: '' },
      constraints: { basicConstraints: [] },
      dependencies: { relevantDependencies: [] },
      behavior: { behaviorRules: [], clockResetNotes: '' }
    };

    setState((current) => ({
      ...current,
      moduleList: [...current.moduleList, { id: nextId, name: cleanName, kind: newModuleKind }],
      selectedModuleId: nextId,
      packageContentByModuleId: { ...current.packageContentByModuleId, [nextId]: newPackage },
      packageStatusByModuleId: { ...current.packageStatusByModuleId, [nextId]: statusForPackage(newPackage) }
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
          <div className="status-row">
            <StatusBadge label="Identity" status={currentPackageStatus.identity} />
            <StatusBadge label="Purpose" status={currentPackageStatus.purpose} />
            <StatusBadge label="Interfaces" status={currentPackageStatus.interfaces} />
          </div>

          <div className="connection-list">
            <strong>Connections</strong>
            {moduleConnections.length === 0 ? <p className="muted">No connections for this module.</p> : (
              <ul>
                {moduleConnections.map((connection, index) => (
                  <li key={`${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`}>{connection.fromModuleId} → {connection.toModuleId} ({connection.signal})</li>
                ))}
              </ul>
            )}
          </div>

          <label>
            Identity / Name
            <input value={currentPackageContent.identity?.name ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, name: event.target.value } }))} placeholder="module name" />
          </label>
          <label>
            Purpose
            <textarea value={currentPackageContent.purpose?.summary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, purpose: { ...current.purpose, summary: event.target.value } }))} rows={3} placeholder="what does this module do?" />
          </label>
          <label>
            Input ports (comma-separated)
            <input value={stringifyList(portsForDirection(currentPackageContent, 'input'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'input', parseList(event.target.value)))} placeholder="in_a, in_b" />
          </label>
          <label>
            Output ports (comma-separated)
            <input value={stringifyList(portsForDirection(currentPackageContent, 'output'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'output', parseList(event.target.value)))} placeholder="out_a, out_b" />
          </label>

          <div className="payload-preview">
            <strong>GenerationPayloadMinimal v1 (derived)</strong>
            <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}

type StatusBadgeProps = {
  label: string;
  status: PackageSectionStatus;
};

function StatusBadge({ label, status }: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-${status}`}>{label}: {status}</span>;
}
