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
  toggleEdgeBundle: (groupKey: string) => void;
  collapseAllEdgeBundles: () => void;
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
  toggleEdgeBundle,
  collapseAllEdgeBundles,
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
  const layout = createDiagramLayout(
    visibleModules,
    state.packageContentByModuleId,
    visibleConnections,
    currentHierarchyModule?.id,
    state.ui.expandedEdgeBundleKeys
  );
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
  const bundledEdgeGroups = layout.edgeGroups.filter((group) => group.connections.length > 1);
  const edgeGroupsByKey = new Map(layout.edgeGroups.map((group) => [group.groupKey, group]));
  const expandedBundleCount = bundledEdgeGroups.filter((group) => group.isExpanded).length;
  const noSelectionVisible = Boolean(selectedModule && !selectedVisibleNode && selectedModule.id !== currentHierarchyModule?.id);
  const createDisabled = !state.ui.newModuleName.trim();
  const renameDisabled = !state.ui.renameDraft.trim();
  const connectDisabled = !state.ui.connectionDraft.signal.trim();

  return (
    <section className="panel center-panel" aria-labelledby="diagram-workspace-title">
      <div className="diagram-header-row">
        <div>
          <h2 id="diagram-workspace-title">Diagram Workspace</h2>
          <p className="muted">SVG-based MVP surface derived directly from reducer state, now polished around hierarchy framing, visibility cues, and bundle inspection.</p>
        </div>
        <div className="diagram-stats" aria-label="Diagram statistics">
          <span>{layout.nodes.length} modules</span>
          <span>{visibleConnections.length} connections</span>
          <span>{bundledEdgeGroups.length} bundles</span>
          <span>{expandedBundleCount} expanded</span>
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
                aria-current={isCurrent ? 'page' : undefined}
              >
                {item.label}
              </button>
              {!isCurrent ? <span className="breadcrumb-separator">/</span> : null}
            </span>
          );
        })}
      </nav>

      {noSelectionVisible ? (
        <div className="diagram-inline-notice" role="status">
          <strong>{selectedModule?.name}</strong> is outside the current scope. Use the breadcrumb, parent navigation, or scope fit to re-orient the canvas.
        </div>
      ) : null}

      <div className="diagram-surface-card">
        <div className="diagram-surface-header">
          <div className="diagram-surface-header-copy">
            <strong>Hierarchy framing and connections</strong>
            <p className="muted">Use scope-fit for the current composite, selection-focus for quick inspection, or overview for a wider hierarchy read. Bundles collapse repeated endpoint pairs until you expand them for signal-level inspection.</p>
          </div>
          <div className="diagram-surface-controls">
            <div className="diagram-viewport-controls" aria-label="Diagram viewport controls">
              <button
                type="button"
                className={diagramViewportMode === 'fit_scope' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
                aria-pressed={diagramViewportMode === 'fit_scope'}
                onClick={() => setDiagramViewportMode('fit_scope')}
              >
                Fit scope
              </button>
              <button
                type="button"
                className={diagramViewportMode === 'focus_selection' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
                aria-pressed={diagramViewportMode === 'focus_selection'}
                onClick={() => setDiagramViewportMode('focus_selection')}
              >
                Focus selection
              </button>
              <button
                type="button"
                className={diagramViewportMode === 'overview' ? 'diagram-viewport-button active' : 'diagram-viewport-button'}
                aria-pressed={diagramViewportMode === 'overview'}
                onClick={() => setDiagramViewportMode('overview')}
              >
                Overview
              </button>
            </div>
            <div className="diagram-viewport-controls" aria-label="Edge bundle controls">
              <button type="button" className="diagram-viewport-button" onClick={collapseAllEdgeBundles} disabled={expandedBundleCount === 0}>
                Collapse bundles
              </button>
            </div>
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
              const shouldToggle = edge.connections.length > 1;
              const toggleLabel = edge.isExpanded ? 'Collapse bundle' : 'Expand bundle';
              const edgeGroup = edgeGroupsByKey.get(edge.groupKey);

              return (
                <g
                  key={edge.key}
                  data-testid={`diagram-edge-${edge.groupKey.replace(/[^a-z0-9_-]+/gi, '_')}`}
                  className={edge.isBundle ? 'diagram-edge-group' : undefined}
                  onClick={() => shouldToggle ? toggleEdgeBundle(edge.groupKey) : undefined}
                  onKeyDown={(event) => {
                    if (shouldToggle && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      toggleEdgeBundle(edge.groupKey);
                    }
                  }}
                  role={shouldToggle ? 'button' : undefined}
                  tabIndex={shouldToggle ? 0 : undefined}
                  aria-label={shouldToggle && edgeGroup ? `${toggleLabel} for ${edgeGroup.fromLabel} to ${edgeGroup.toLabel}` : undefined}
                  aria-expanded={shouldToggle ? edge.isExpanded : undefined}
                >
                  <path
                    d={edge.path}
                    className={[
                      'diagram-edge',
                      edge.kind === 'cross_boundary' ? 'diagram-edge-boundary' : 'diagram-edge-sibling',
                      edge.isBundle ? 'diagram-edge-bundle' : '',
                      edge.isExpanded ? 'diagram-edge-expanded' : ''
                    ].filter(Boolean).join(' ')}
                    markerEnd="url(#diagram-arrow)"
                  />
                  <text x={edge.labelX} y={edge.labelY} className="diagram-edge-label" textAnchor="middle">
                    {edge.label}
                  </text>
                  {edge.isBundle ? (
                    <>
                      <rect x={edge.badgeX - 60} y={edge.badgeY - 12} width="120" height="20" rx="10" className="diagram-edge-bundle-badge" />
                      <text x={edge.badgeX} y={edge.badgeY + 2} className="diagram-edge-bundle-text" textAnchor="middle">
                        {edge.isExpanded ? 'Collapse bundle' : 'Expand bundle'}
                      </text>
                    </>
                  ) : null}
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
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        selectModule(node.module.id);
                        return;
                      }

                      if (event.key === ' ' && node.module.kind === 'composite') {
                        event.preventDefault();
                        setHierarchyView(node.module.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.module.name}, ${node.module.kind} module`}
                    aria-pressed={isSelected}
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
          <span><strong>Blue</strong> = sibling wiring</span>
          <span><strong>Amber dashed</strong> = scope boundary wiring</span>
        </div>
        <div className="diagram-edge-inspector" aria-label="Connection bundle inspector">
          <div className="diagram-edge-inspector-header">
            <div>
              <strong>Connection bundles</strong>
              <p className="muted">Repeated endpoint pairs collapse into one bundle. Expand only the path you need to inspect.</p>
            </div>
            <div className="diagram-edge-inspector-meta">
              <span className="diagram-edge-inspector-chip">{bundledEdgeGroups.length} grouped paths</span>
              <span className="diagram-edge-inspector-chip">{expandedBundleCount} expanded</span>
            </div>
          </div>
          {bundledEdgeGroups.length === 0 ? (
            <div className="empty-state-card">
              <strong>No bundled edge groups in this scope</strong>
              <p className="muted">Repeated endpoint pairs will collapse here automatically once the current hierarchy view becomes dense enough.</p>
            </div>
          ) : (
            <div className="diagram-edge-bundle-list">
              {bundledEdgeGroups.map((group) => (
                <div key={group.groupKey} className="diagram-edge-bundle-card">
                  <div>
                    <strong>{group.fromLabel} → {group.toLabel}</strong>
                    <p className="muted">{group.kind === 'sibling' ? 'Sibling-to-sibling connectivity inside this parent scope.' : 'Crosses the current scope boundary through the parent module.'}</p>
                  </div>
                  <div className="diagram-edge-bundle-card-actions">
                    <span className="diagram-edge-bundle-chip">{group.connections.length} signals</span>
                    <button type="button" className="diagram-viewport-button" onClick={() => toggleEdgeBundle(group.groupKey)} aria-expanded={group.isExpanded}>
                      {group.isExpanded ? 'Collapse signals' : 'Expand signals'}
                    </button>
                  </div>
                  <div className="diagram-edge-bundle-signals">
                    {(group.isExpanded ? group.connections : group.connections.slice(0, 3)).map((connection) => (
                      <span key={`${group.groupKey}-${connection.signal}`} className="diagram-edge-signal-chip">{connection.signal}</span>
                    ))}
                    {!group.isExpanded && group.connections.length > 3 ? (
                      <span className="diagram-edge-signal-chip">+{group.connections.length - 3} more</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="diagram-toolbar-grid">
        <div className="diagram-tool-card">
          <strong>Create module in current scope</strong>
          <p className="muted">This quick form mirrors the ribbon so common structure edits stay close to the canvas.</p>
          <div className="inline-form inline-form-tight">
            <input value={state.ui.newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" aria-label="Diagram new block name" />
            <select value={state.ui.newModuleKind} onChange={(event) => setNewModuleKind(event.target.value as ModuleKind)} aria-label="Block kind">
              <option value="leaf">leaf</option>
              <option value="composite">composite</option>
            </select>
            <button type="button" onClick={createModule} disabled={createDisabled}>Create block</button>
          </div>
        </div>

        <div className="diagram-tool-card">
          <strong>Rename selected block</strong>
          <p className="muted">Selection-driven rename keeps naming aligned across the diagram, package, and review flows.</p>
          <div className="inline-form inline-form-tight">
            <input
              value={state.ui.renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder={selectedModule?.name ?? 'module name'}
              aria-label="Rename selected block"
            />
            <button type="button" onClick={renameSelectedModule} disabled={renameDisabled}>Rename block</button>
          </div>
        </div>

        <div className="diagram-tool-card">
          <strong>Connect visible blocks</strong>
          <p className="muted">Use the same draft fields as the ribbon when you want to wire blocks without leaving the current diagram context.</p>
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
            <input value={state.ui.connectionDraft.signal} onChange={(event) => setConnectionDraft({ ...state.ui.connectionDraft, signal: event.target.value })} placeholder="signal" aria-label="Diagram connection signal" />
            <button type="button" onClick={addConnection} disabled={connectDisabled}>Connect</button>
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
