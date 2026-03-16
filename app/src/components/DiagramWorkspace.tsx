import type { Dispatch, SetStateAction } from 'react';
import type { DesignState, ModuleNode } from '../types';

type DiagramWorkspaceProps = {
  state: DesignState;
  newModuleName: string;
  setNewModuleName: (value: string) => void;
  newModuleKind: ModuleNode['kind'];
  setNewModuleKind: (value: ModuleNode['kind']) => void;
  createModule: () => void;
  setState: Dispatch<SetStateAction<DesignState>>;
  renameDraft: string;
  setRenameDraft: (value: string) => void;
  selectedModule?: ModuleNode;
  renameSelectedModule: () => void;
  connectionDraft: { fromModuleId: string; toModuleId: string; signal: string };
  setConnectionDraft: Dispatch<SetStateAction<{ fromModuleId: string; toModuleId: string; signal: string }>>;
  addConnection: () => void;
};

export function DiagramWorkspace({
  state,
  newModuleName,
  setNewModuleName,
  newModuleKind,
  setNewModuleKind,
  createModule,
  setState,
  renameDraft,
  setRenameDraft,
  selectedModule,
  renameSelectedModule,
  connectionDraft,
  setConnectionDraft,
  addConnection
}: DiagramWorkspaceProps): JSX.Element {
  return (
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
        <strong>Rename selected block</strong>
        <div className="inline-form">
          <input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            placeholder={selectedModule?.name ?? 'module name'}
          />
          <button type="button" onClick={renameSelectedModule}>Rename block</button>
        </div>
      </div>
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
  );
}
