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
  interfaceInput: string;
  interfaceOutput: string;
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
    interfaces: sectionStatus([modulePackage.interfaceInput, modulePackage.interfaceOutput])
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
      interfaceInput: 'cfg_bus',
      interfaceOutput: 'data_out'
    },
    child_a: {
      identityName: 'input_fifo',
      purposeSummary: '',
      interfaceInput: 'data_in',
      interfaceOutput: 'fifo_out'
    },
    child_b: {
      identityName: 'scheduler',
      purposeSummary: '',
      interfaceInput: '',
      interfaceOutput: ''
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

export function App(): JSX.Element {
  const [state, setState] = useState<DesignState>(seedState);

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

  const updatePackage = (field: keyof ModulePackage, value: string) => {
    setState((current) => ({
      ...current,
      packageContentByModuleId: {
        ...current.packageContentByModuleId,
        [current.selectedModuleId]: {
          ...current.packageContentByModuleId[current.selectedModuleId],
          [field]: value
        }
      },
      packageStatusByModuleId: {
        ...current.packageStatusByModuleId,
        [current.selectedModuleId]: statusForPackage({
          ...current.packageContentByModuleId[current.selectedModuleId],
          [field]: value
        })
      },
      moduleList:
        field === 'identityName'
          ? current.moduleList.map((moduleNode) =>
              moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: value || 'unnamed_module' } : moduleNode
            )
          : current.moduleList
    }));
  };

  const applyMockSuggestion = () => {
    setState((current) => ({
      ...current,
      packageContentByModuleId: {
        ...current.packageContentByModuleId,
        [current.selectedModuleId]: {
          ...current.packageContentByModuleId[current.selectedModuleId],
          purposeSummary: 'AI suggestion: clarify module behavior and key constraints in one sentence.'
        }
      },
      packageStatusByModuleId: {
        ...current.packageStatusByModuleId,
        [current.selectedModuleId]: statusForPackage({
          ...current.packageContentByModuleId[current.selectedModuleId],
          purposeSummary: 'AI suggestion: clarify module behavior and key constraints in one sentence.'
        })
      }
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
          <p className="muted">Simple module list as a stand-in for diagram canvas.</p>
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
            Interface input
            <input
              value={currentPackageContent.interfaceInput}
              onChange={(event) => updatePackage('interfaceInput', event.target.value)}
              placeholder="input interface"
            />
          </label>

          <label>
            Interface output
            <input
              value={currentPackageContent.interfaceOutput}
              onChange={(event) => updatePackage('interfaceOutput', event.target.value)}
              placeholder="output interface"
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
