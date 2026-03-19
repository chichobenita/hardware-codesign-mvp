import type { ModuleKind, ModuleNode } from '../../../shared/src';
import type { Connection, DesignState, HierarchyBreadcrumbItem } from '../types';
import { createDiagramLayout } from './diagram/layout';

type DiagramWorkspaceProps = {
  state: DesignState;
  visibleModules: ModuleNode[];
  visibleConnections: Connection[];
  currentHierarchyModule?: ModuleNode;
  currentHierarchyBreadcrumbs: HierarchyBreadcrumbItem[];
  parentHierarchyModuleId: string | null;
  setHierarchyView: (moduleId: string) => void;
  navigateToParentHierarchy: () => void;
  setNewModuleName: (value: string) => void;
  setNewModuleKind: (value: ModuleKind) => void;
  createModule: () => void;
  selectModule: (moduleId: string) => void;
  setRenameDraft: (value: string) => void;
  selectedModule?: ModuleNode;
  renameSelectedModule: () => void;
  enterSelectedComposite: () => void;
  setConnectionDraft: (next: Connection) => void;
  addConnection: () => void;
};

export function DiagramWorkspace({
  state,
  visibleModules,
  visibleConnections,
  currentHierarchyModule,
  currentHierarchyBreadcrumbs,
  parentHierarchyModuleId,
  setHierarchyView,
  navigateToParentHierarchy,
  setNewModuleName,
  setNewModuleKind,
  createModule,
  selectModule,
  setRenameDraft,
  selectedModule,
  renameSelectedModule,
  enterSelectedComposite,
  setConnectionDraft,
  addConnection
}: DiagramWorkspaceProps): JSX.Element {
  const layout = createDiagramLayout(visibleModules, state.packageContentByModuleId, visibleConnections);
  const selectedIsComposite = selectedModule?.kind === 'composite';

  return (
    <section className="panel center-panel">
      <div className="diagram-header-row">
        <div>
          <h2>Diagram Workspace</h2>
          <p className="muted">SVG-based MVP surface derived directly from reducer state.</p>
        </div>
        <div className="diagram-stats" aria-label="Diagram statistics">
          <span>{layout.nodes.length} modules</span>
          <span>{layout.edges.length} connections</span>
        </div>
      </div>

      <div className="hierarchy-toolbar" aria-label="Hierarchy navigation">
        <div>
          <strong>Current scope</strong>
          <p className="muted">{currentHierarchyModule?.name ?? 'workspace'} child-level view</p>
        </div>
        <div className="hierarchy-actions">
          <button type="button" onClick={navigateToParentHierarchy} disabled={!parentHierarchyModuleId}>
            Back to parent
          </button>
          <button type="button" onClick={enterSelectedComposite} disabled={!selectedIsComposite}>
            Enter selected composite
          </button>
        </div>
      </div>

      <nav className="breadcrumb-row" aria-label="Hierarchy breadcrumb">
        {currentHierarchyBreadcrumbs.map((item, index) => {
          const isCurrent = index === currentHierarchyBreadcrumbs.length - 1;
          return (
            <span key={`${item.moduleId}-${index}`} className="breadcrumb-item-wrap">
              <button
                type="button"
                className={isCurrent ? 'breadcrumb-item current' : 'breadcrumb-item'}
                onClick={() => setHierarchyView(item.moduleId)}
                disabled={isCurrent}
              >
                {item.label}
              </button>
              {!isCurrent ? <span className="breadcrumb-separator">/</span> : null}
            </span>
          );
        })}
      </nav>

      <div className="diagram-surface-card">
        <svg
          className="diagram-surface"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Hardware module diagram"
        >
          <defs>
            <marker id="diagram-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L10,5 L0,10 z" className="diagram-arrow-head" />
            </marker>
          </defs>

          <g aria-label="Diagram edges">
            {layout.edges.map((edge) => {
              const midX = (edge.fromX + edge.toX) / 2;
              const midY = (edge.fromY + edge.toY) / 2;
              return (
                <g key={edge.key} data-testid={`diagram-edge-${edge.connection.fromModuleId}-${edge.connection.toModuleId}`}>
                  <line
                    x1={edge.fromX}
                    y1={edge.fromY}
                    x2={edge.toX}
                    y2={edge.toY}
                    className="diagram-edge"
                    markerEnd="url(#diagram-arrow)"
                  />
                  <text x={midX} y={midY - 8} className="diagram-edge-label" textAnchor="middle">
                    {edge.signal}
                  </text>
                </g>
              );
            })}
          </g>

          <g aria-label="Diagram nodes">
            {layout.nodes.map((node) => {
              const isSelected = node.module.id === state.selectedModuleId;
              const rectClassName = [
                'diagram-node-rect',
                isSelected ? 'diagram-node-selected' : '',
                node.module.kind === 'composite' ? 'diagram-node-composite' : 'diagram-node-leaf'
              ].filter(Boolean).join(' ');
              return (
                <g
                  key={node.module.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  data-testid={`diagram-node-${node.module.id}`}
                >
                  <rect
                    width={node.width}
                    height={node.height}
                    rx="14"
                    className={rectClassName}
                    onClick={() => selectModule(node.module.id)}
                  />
                  <text x="16" y="24" className="diagram-node-level">{node.depthLabel}</text>
                  <text x="16" y="48" className="diagram-node-title">{node.module.name}</text>
                  <text x="16" y="67" className="diagram-node-subtitle">{node.module.kind === 'composite' ? 'composite module' : 'leaf module'}</text>
                  <text x="16" y="84" className="diagram-node-meta">{node.hierarchyLabel}</text>
                  <text x={node.width - 16} y="24" textAnchor="end" className="diagram-node-badge">{node.relationshipBadge}</text>
                </g>
              );
            })}
          </g>
        </svg>
        <div className="diagram-legend muted">
          <span><strong>Lx</strong> = deterministic hierarchy depth column</span>
          <span><strong>Badge</strong> = parent/child/top cue</span>
          <span><strong>Scope</strong> = selected composite and direct children</span>
        </div>
      </div>

      <div className="diagram-toolbar-grid">
        <div className="diagram-tool-card">
          <strong>Create module in current scope</strong>
          <div className="inline-form inline-form-tight">
            <input value={state.ui.newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" />
            <select value={state.ui.newModuleKind} onChange={(event) => setNewModuleKind(event.target.value as ModuleKind)} aria-label="Block kind">
              <option value="leaf">leaf</option>
              <option value="composite">composite</option>
            </select>
            <button type="button" onClick={createModule}>Create block</button>
          </div>
        </div>

        <div className="diagram-tool-card">
          <strong>Rename selected block</strong>
          <div className="inline-form inline-form-tight">
            <input
              value={state.ui.renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder={selectedModule?.name ?? 'module name'}
            />
            <button type="button" onClick={renameSelectedModule}>Rename block</button>
          </div>
        </div>

        <div className="diagram-tool-card">
          <strong>Connect visible blocks</strong>
          <div className="inline-form inline-form-tight">
            <select value={state.ui.connectionDraft.fromModuleId} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, fromModuleId: event.target.value })} aria-label="Connection source">
              {visibleModules.map((moduleNode) => (
                <option key={`from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
              ))}
            </select>
            <select value={state.ui.connectionDraft.toModuleId} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, toModuleId: event.target.value })} aria-label="Connection target">
              {visibleModules.map((moduleNode) => (
                <option key={`to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
              ))}
            </select>
            <input value={state.ui.connectionDraft.signal} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, signal: event.target.value })} placeholder="signal" />
            <button type="button" onClick={addConnection}>Connect</button>
          </div>
        </div>
      </div>
    </section>
  );
}
