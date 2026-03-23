import type { ModuleKind, ModuleNode } from '../../../shared/src';
import type { Connection, DesignState, DiagramViewportMode, HierarchyBreadcrumbItem } from '../types';
import { createDiagramLayout } from './diagram/layout';

type DiagramWorkspaceProps = {
  state: DesignState;
  visibleModules: ModuleNode[];
  visibleConnections: Connection[];
  currentHierarchyModule?: ModuleNode;
  currentHierarchyBreadcrumbs: HierarchyBreadcrumbItem[];
  parentHierarchyModuleId: string | null;
  diagramViewportMode: DiagramViewportMode;
  setHierarchyView: (moduleId: string) => void;
  setDiagramViewportMode: (mode: DiagramViewportMode) => void;
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
  diagramViewportMode,
  setHierarchyView,
  setDiagramViewportMode,
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
  const selectedVisibleNode = layout.nodes.find((node) => node.module.id === selectedModule?.id);
  const scopeNode = layout.nodes.find((node) => node.module.id === currentHierarchyModule?.id) ?? layout.nodes[0];
  const viewportNode = diagramViewportMode === 'focus_selection'
    ? selectedVisibleNode ?? scopeNode
    : scopeNode;
  const viewport = createViewportFrame(layout, viewportNode, diagramViewportMode);
  const directChildCount = visibleModules.filter((moduleNode) => moduleNode.id !== currentHierarchyModule?.id).length;
  const selectionRelationship = selectedModule?.id === currentHierarchyModule?.id
    ? 'scope module'
    : selectedVisibleNode
      ? 'visible child'
      : 'outside visible scope';

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
        <div className="hierarchy-toolbar-copy">
          <div>
            <strong>Current scope</strong>
            <p className="muted">{currentHierarchyModule?.name ?? 'workspace'} child-level view</p>
          </div>
          <div className="hierarchy-summary-grid" aria-label="Hierarchy scope summary">
            <div className="hierarchy-summary-card">
              <span className="hierarchy-summary-label">Parent</span>
              <strong>{parentHierarchyModuleId ? 'Available' : 'Root scope'}</strong>
            </div>
            <div className="hierarchy-summary-card">
              <span className="hierarchy-summary-label">Children</span>
              <strong>{directChildCount}</strong>
            </div>
            <div className="hierarchy-summary-card">
              <span className="hierarchy-summary-label">Selection</span>
              <strong>{selectedModule?.name ?? 'None'}</strong>
              <span className="hierarchy-summary-footnote">{selectionRelationship}</span>
            </div>
          </div>
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
        <div className="diagram-surface-header">
          <div className="diagram-surface-header-copy">
            <strong>Hierarchy framing</strong>
            <p className="muted">Use scope-fit for the current composite, selection-focus for quick inspection, or overview for a wider hierarchy read.</p>
          </div>
          <div className="diagram-viewport-controls" aria-label="Diagram viewport controls">
            <button
              type="button"
              className={diagramViewportMode === 'fit_scope' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
              onClick={() => setDiagramViewportMode('fit_scope')}
            >
              Fit scope
            </button>
            <button
              type="button"
              className={diagramViewportMode === 'focus_selection' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
              onClick={() => setDiagramViewportMode('focus_selection')}
            >
              Focus selection
            </button>
            <button
              type="button"
              className={diagramViewportMode === 'overview' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
              onClick={() => setDiagramViewportMode('overview')}
            >
              Overview
            </button>
          </div>
        </div>
        <svg
          className="diagram-surface"
          viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
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
                    onDoubleClick={() => node.module.kind === 'composite' ? setHierarchyView(node.module.id) : undefined}
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
          <span><strong>Viewport</strong> = reducer-owned fit/focus mode</span>
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

type ViewportFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clampViewport(layoutSize: number, viewportSize: number, position: number): number {
  const maxPosition = Math.max(0, layoutSize - viewportSize);
  return Math.min(Math.max(0, position), maxPosition);
}

function createViewportFrame(
  layout: ReturnType<typeof createDiagramLayout>,
  focalNode: ReturnType<typeof createDiagramLayout>['nodes'][number] | undefined,
  mode: DiagramViewportMode
): ViewportFrame {
  if (mode === 'overview' || !focalNode) {
    return { x: 0, y: 0, width: layout.width, height: layout.height };
  }

  const zoomFactor = mode === 'focus_selection' ? 0.64 : 0.82;
  const width = Math.max(320, Math.round(layout.width * zoomFactor));
  const height = Math.max(220, Math.round(layout.height * zoomFactor));
  const x = clampViewport(layout.width, width, focalNode.centerX - width / 2);
  const y = clampViewport(layout.height, height, focalNode.centerY - height / 2);

  return { x, y, width, height };
}
