import type { Connection, DesignState, ModuleNode } from '../types';

type DiagramWorkspaceProps = {
  state: DesignState;
  setNewModuleName: (value: string) => void;
  setNewModuleKind: (value: ModuleNode['kind']) => void;
  createModule: () => void;
  selectModule: (moduleId: string) => void;
  setRenameDraft: (value: string) => void;
  selectedModule?: ModuleNode;
  renameSelectedModule: () => void;
  setConnectionDraft: (next: Connection) => void;
  addConnection: () => void;
};

export function DiagramWorkspace({
  state,
  setNewModuleName,
  setNewModuleKind,
  createModule,
  selectModule,
  setRenameDraft,
  selectedModule,
  renameSelectedModule,
  setConnectionDraft,
  addConnection
}: DiagramWorkspaceProps): JSX.Element {
  return (
    <section className="panel center-panel">
      <h2>Diagram Workspace</h2>
      <p className="muted">Basic interactions: create, select, and connect blocks.</p>
      <div className="inline-form">
        <input value={state.ui.newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" />
        <select value={state.ui.newModuleKind} onChange={(event) => setNewModuleKind(event.target.value as ModuleNode['kind'])} aria-label="Block kind">
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
              onClick={() => selectModule(moduleNode.id)}
            >
              <span>{moduleNode.name}</span>
              <small>{moduleNode.kind}</small>
            </button>
          </li>
        ))}
      </ul>
      <div className="connection-builder">
        <strong>Rename selected block</strong>
        <div className="inline-form">
          <input
            value={state.ui.renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder={selectedModule?.name ?? 'module name'}
          />
          <button type="button" onClick={renameSelectedModule}>Rename block</button>
        </div>
      </div>
      <div className="connection-builder">
        <strong>Connect blocks</strong>
        <div className="inline-form">
          <select value={state.ui.connectionDraft.fromModuleId} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, fromModuleId: event.target.value })} aria-label="Connection source">
            {state.moduleList.map((moduleNode) => (
              <option key={`from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
            ))}
          </select>
          <select value={state.ui.connectionDraft.toModuleId} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, toModuleId: event.target.value })} aria-label="Connection target">
            {state.moduleList.map((moduleNode) => (
              <option key={`to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
            ))}
          </select>
          <input value={state.ui.connectionDraft.signal} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, signal: event.target.value })} placeholder="signal" />
          <button type="button" onClick={addConnection}>Connect</button>
        </div>
      </div>
    </section>
  );
}
