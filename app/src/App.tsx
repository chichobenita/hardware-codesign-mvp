import { useMemo, useState } from 'react';

type ModuleNode = {
  id: string;
  name: string;
  kind: 'composite' | 'leaf';
};

type PackageSectionStatus = 'empty' | 'partial' | 'complete';

type ModulePackage = {
  identityName: string;
  purposeSummary: string;
  interfaceInput: string;
  interfaceOutput: string;
};

type DesignState = {
  modules: ModuleNode[];
  selectedModuleId: string;
  packagesByModuleId: Record<string, ModulePackage>;
};

const seedState: DesignState = {
  modules: [
    { id: 'root', name: 'top_controller', kind: 'composite' },
    { id: 'child_a', name: 'input_fifo', kind: 'leaf' },
    { id: 'child_b', name: 'scheduler', kind: 'leaf' }
  ],
  selectedModuleId: 'root',
  packagesByModuleId: {
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

  const selectedPackage = state.packagesByModuleId[state.selectedModuleId];

  const statuses = useMemo(
    () => ({
      identity: sectionStatus([selectedPackage.identityName]),
      purpose: sectionStatus([selectedPackage.purposeSummary]),
      interfaces: sectionStatus([selectedPackage.interfaceInput, selectedPackage.interfaceOutput])
    }),
    [selectedPackage]
  );

  const updatePackage = (field: keyof ModulePackage, value: string) => {
    setState((current) => ({
      ...current,
      packagesByModuleId: {
        ...current.packagesByModuleId,
        [current.selectedModuleId]: {
          ...current.packagesByModuleId[current.selectedModuleId],
          [field]: value
        }
      },
      modules:
        field === 'identityName'
          ? current.modules.map((moduleNode) =>
              moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: value || 'unnamed_module' } : moduleNode
            )
          : current.modules
    }));
  };

  const applyMockSuggestion = () => {
    setState((current) => ({
      ...current,
      packagesByModuleId: {
        ...current.packagesByModuleId,
        [current.selectedModuleId]: {
          ...current.packagesByModuleId[current.selectedModuleId],
          purposeSummary: 'AI suggestion: clarify module behavior and key constraints in one sentence.'
        }
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
            {state.modules.map((moduleNode) => (
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
        </section>

        <section className="panel right-panel">
          <h2>Module Package</h2>
          <p className="muted">Selected module: {state.selectedModuleId}</p>

          <div className="status-row">
            <StatusBadge label="Identity" status={statuses.identity} />
            <StatusBadge label="Purpose" status={statuses.purpose} />
            <StatusBadge label="Interfaces" status={statuses.interfaces} />
          </div>

          <label>
            Identity / Name
            <input
              value={selectedPackage.identityName}
              onChange={(event) => updatePackage('identityName', event.target.value)}
              placeholder="module name"
            />
          </label>

          <label>
            Purpose
            <textarea
              value={selectedPackage.purposeSummary}
              onChange={(event) => updatePackage('purposeSummary', event.target.value)}
              rows={3}
              placeholder="what does this module do?"
            />
          </label>

          <label>
            Interface input
            <input
              value={selectedPackage.interfaceInput}
              onChange={(event) => updatePackage('interfaceInput', event.target.value)}
              placeholder="input interface"
            />
          </label>

          <label>
            Interface output
            <input
              value={selectedPackage.interfaceOutput}
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
