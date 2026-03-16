import { useMemo, useState } from 'react';

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

type ModulePackage = {
  identityName: string;
  purposeSummary: string;
  inputPorts: string[];
  outputPorts: string[];
};

type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  packageStatusByModuleId: Record<string, Record<'identity' | 'purpose' | 'interfaces', PackageSectionStatus>>;
};

function statusForPackage(modulePackage: ModulePackage): Record<'identity' | 'purpose' | 'interfaces', PackageSectionStatus> {
  return {
    identity: sectionStatus([modulePackage.identityName]),
    purpose: sectionStatus([modulePackage.purposeSummary]),
    interfaces: sectionStatus([...modulePackage.inputPorts, ...modulePackage.outputPorts])
  };
}

const seedState: DesignState = {
  moduleList: [
    { id: 'root', name: 'top_controller', kind: 'composite' },
    { id: 'child_a', name: 'input_fifo', kind: 'leaf' },
    { id: 'child_b', name: 'scheduler', kind: 'leaf' }
  ],
  selectedModuleId: 'root',
  connections: [
    { fromModuleId: 'child_a', toModuleId: 'root', signal: 'fifo_out' },
    { fromModuleId: 'root', toModuleId: 'child_b', signal: 'dispatch_cmd' }
  ],
  packageContentByModuleId: {
    root: {
      identityName: 'top_controller',
      purposeSummary: 'Coordinates data flow and control decisions.',
      inputPorts: ['cfg_bus'],
      outputPorts: ['data_out']
    },
    child_a: {
      identityName: 'input_fifo',
      purposeSummary: '',
      inputPorts: ['data_in'],
      outputPorts: ['fifo_out']
    },
    child_b: {
      identityName: 'scheduler',
      purposeSummary: '',
      inputPorts: [],
      outputPorts: []
    }
  },
  packageStatusByModuleId: {
    root: {
      identity: 'complete',
      purpose: 'complete',
      interfaces: 'complete'
    },
    child_a: {
      identity: 'complete',
      purpose: 'empty',
      interfaces: 'complete'
    },
    child_b: {
      identity: 'complete',
      purpose: 'empty',
      interfaces: 'empty'
    }
  }
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

function parsePortList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyPortList(values: string[]): string {
  return values.join(', ');
}

export function App(): JSX.Element {
  const [state, setState] = useState<DesignState>(seedState);
  const [newModuleName, setNewModuleName] = useState('new_module');
  const [newModuleKind, setNewModuleKind] = useState<ModuleNode['kind']>('leaf');
  const [connectionDraft, setConnectionDraft] = useState<Connection>({
    fromModuleId: 'root',
    toModuleId: 'child_a',
    signal: 'signal_name'
  });

  const currentPackageContent = state.packageContentByModuleId[state.selectedModuleId];
  const currentPackageStatus = state.packageStatusByModuleId[state.selectedModuleId];
  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId);

  const moduleConnections = useMemo(
    () =>
      state.connections.filter(
        (connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId
      ),
    [state.connections, state.selectedModuleId]
  );

  const selectModule = (moduleId: string) => {
    setState((current) => ({ ...current, selectedModuleId: moduleId }));
  };

  const updatePackage = (field: keyof ModulePackage, value: string | string[]) => {
    setState((current) => {
      const nextPackage = {
        ...current.packageContentByModuleId[current.selectedModuleId],
        [field]: value
      } as ModulePackage;

      return {
        ...current,
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: nextPackage
        },
        packageStatusByModuleId: {
          ...current.packageStatusByModuleId,
          [current.selectedModuleId]: statusForPackage(nextPackage)
        },
        moduleList:
          field === 'identityName'
            ? current.moduleList.map((moduleNode) =>
                moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: String(value) || 'unnamed_module' } : moduleNode
              )
            : current.moduleList
      };
    });
  };

  const applyMockSuggestion = () => {
    setState((current) => {
      const nextPackage = {
        ...current.packageContentByModuleId[current.selectedModuleId],
        purposeSummary: 'AI suggestion: clarify module behavior and key constraints in one sentence.'
      };

      return {
        ...current,
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: nextPackage
        },
        packageStatusByModuleId: {
          ...current.packageStatusByModuleId,
          [current.selectedModuleId]: statusForPackage(nextPackage)
        }
      };
    });
  };

  const createModule = () => {
    const cleanName = newModuleName.trim() || 'unnamed_module';
    const nextId = `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;

    const newPackage: ModulePackage = {
      identityName: cleanName,
      purposeSummary: '',
      inputPorts: [],
      outputPorts: []
    };

    setState((current) => ({
      ...current,
      moduleList: [...current.moduleList, { id: nextId, name: cleanName, kind: newModuleKind }],
      selectedModuleId: nextId,
      packageContentByModuleId: {
        ...current.packageContentByModuleId,
        [nextId]: newPackage
      },
      packageStatusByModuleId: {
        ...current.packageStatusByModuleId,
        [nextId]: statusForPackage(newPackage)
      }
    }));

    setConnectionDraft((current) => ({ ...current, toModuleId: nextId }));
  };

  const addConnection = () => {
    if (!connectionDraft.fromModuleId || !connectionDraft.toModuleId || !connectionDraft.signal.trim()) {
      return;
    }

    setState((current) => ({
      ...current,
      connections: [...current.connections, { ...connectionDraft, signal: connectionDraft.signal.trim() }]
    }));
  };

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP — Main Workspace</header>

      <main className="workspace-grid">
        <section className="panel left-panel">
          <h2>AI Collaboration</h2>
          <p className="muted">Mock panel only. No real AI integration in v1.</p>
          <div className="chat-bubble">Suggestion: add a clearer purpose statement for the selected module.</div>
          <button type="button" onClick={applyMockSuggestion}>
            Apply suggestion
          </button>
        </section>

        <section className="panel center-panel">
          <h2>Diagram Workspace</h2>
          <p className="muted">Basic interactions: create, select, and connect blocks.</p>

          <div className="inline-form">
            <input value={newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" />
            <select
              value={newModuleKind}
              onChange={(event) => setNewModuleKind(event.target.value as ModuleNode['kind'])}
              aria-label="Block kind"
            >
              <option value="leaf">leaf</option>
              <option value="composite">composite</option>
            </select>
            <button type="button" onClick={createModule}>
              Create block
            </button>
          </div>

          <ul className="module-list">
            {state.moduleList.map((moduleNode) => (
              <li key={moduleNode.id}>
                <button
                  type="button"
                  className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                  onClick={() => selectModule(moduleNode.id)}
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
              <select
                value={connectionDraft.fromModuleId}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, fromModuleId: event.target.value }))}
                aria-label="Connection source"
              >
                {state.moduleList.map((moduleNode) => (
                  <option key={`from-${moduleNode.id}`} value={moduleNode.id}>
                    {moduleNode.name}
                  </option>
                ))}
              </select>
              <select
                value={connectionDraft.toModuleId}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, toModuleId: event.target.value }))}
                aria-label="Connection target"
              >
                {state.moduleList.map((moduleNode) => (
                  <option key={`to-${moduleNode.id}`} value={moduleNode.id}>
                    {moduleNode.name}
                  </option>
                ))}
              </select>
              <input
                value={connectionDraft.signal}
                onChange={(event) => setConnectionDraft((current) => ({ ...current, signal: event.target.value }))}
                placeholder="signal"
              />
              <button type="button" onClick={addConnection}>
                Connect
              </button>
            </div>
          </div>
        </section>

        <section className="panel right-panel">
          <h2>Module Package</h2>
          <p className="muted">
            Selected module: {selectedModule?.name} ({state.selectedModuleId})
          </p>

          <div className="status-row">
            <StatusBadge label="Identity" status={currentPackageStatus.identity} />
            <StatusBadge label="Purpose" status={currentPackageStatus.purpose} />
            <StatusBadge label="Interfaces" status={currentPackageStatus.interfaces} />
          </div>

          <div className="connection-list">
            <strong>Connections</strong>
            {moduleConnections.length === 0 ? (
              <p className="muted">No connections for this module.</p>
            ) : (
              <ul>
                {moduleConnections.map((connection, index) => (
                  <li key={`${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`}>
                    {connection.fromModuleId} → {connection.toModuleId} ({connection.signal})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label>
            Identity / Name
            <input
              value={currentPackageContent.identityName}
              onChange={(event) => updatePackage('identityName', event.target.value)}
              placeholder="module name"
            />
          </label>

          <label>
            Purpose
            <textarea
              value={currentPackageContent.purposeSummary}
              onChange={(event) => updatePackage('purposeSummary', event.target.value)}
              rows={3}
              placeholder="what does this module do?"
            />
          </label>

          <label>
            Input ports (comma-separated)
            <input
              value={stringifyPortList(currentPackageContent.inputPorts)}
              onChange={(event) => updatePackage('inputPorts', parsePortList(event.target.value))}
              placeholder="in_a, in_b"
            />
          </label>

          <label>
            Output ports (comma-separated)
            <input
              value={stringifyPortList(currentPackageContent.outputPorts)}
              onChange={(event) => updatePackage('outputPorts', parsePortList(event.target.value))}
              placeholder="out_a, out_b"
            />
          </label>
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
  return (
    <span className={`status-badge status-${status}`}>
      {label}: {status}
    </span>
  );
}
