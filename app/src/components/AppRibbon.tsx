import type { ModuleNode } from '../../../shared/src';
import type { Connection, DiagramViewportMode, SecondaryWorkspace } from '../types';

type AppRibbonProps = {
  selectedModule?: ModuleNode;
  currentHierarchyModule?: ModuleNode;
  currentHierarchyRootModuleId?: string;
  activeSecondaryWorkspace: SecondaryWorkspace;
  visibleModules: ModuleNode[];
  newModuleName: string;
  connectionDraft: Connection;
  openSecondaryWorkspace: (workspace: Exclude<SecondaryWorkspace, 'none'>) => void;
  closeSecondaryWorkspace: () => void;
  setNewModuleName: (value: string) => void;
  createLeafModule: () => void;
  createCompositeModule: () => void;
  setConnectionDraft: (value: Connection) => void;
  addConnection: () => void;
  useSelectedModuleAsConnectionSource: () => void;
  setDiagramViewportMode: (mode: DiagramViewportMode) => void;
  collapseAllEdgeBundles: () => void;
  diagramViewportMode: DiagramViewportMode;
  enterSelectedComposite: () => void;
  jumpToRootHierarchy: () => void;
  navigateToParentHierarchy: () => void;
  regenerateProposalsForSelectedModule: () => void;
  canNavigateToParent: boolean;
  canEnterSelectedComposite: boolean;
};

type MenuAction = {
  description?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

function MenuActionButton({ action }: { action: MenuAction }): JSX.Element {
  return (
    <button
      type="button"
      className="menu-panel-action"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
    >
      <strong>{action.label}</strong>
      {action.description ? <span>{action.description}</span> : null}
    </button>
  );
}

function getWorkspaceLabel(workspace: SecondaryWorkspace): string {
  switch (workspace) {
    case 'package_editor':
      return 'Package editor';
    case 'review':
      return 'Review';
    case 'handoff':
      return 'Handoff';
    case 'validation':
      return 'Validation';
    case 'project_data':
      return 'Project data';
    default:
      return 'None';
  }
}

export function AppRibbon({
  selectedModule,
  currentHierarchyModule,
  currentHierarchyRootModuleId,
  activeSecondaryWorkspace,
  visibleModules,
  newModuleName,
  connectionDraft,
  openSecondaryWorkspace,
  closeSecondaryWorkspace,
  setNewModuleName,
  createLeafModule,
  createCompositeModule,
  setConnectionDraft,
  addConnection,
  useSelectedModuleAsConnectionSource,
  setDiagramViewportMode,
  collapseAllEdgeBundles,
  diagramViewportMode,
  enterSelectedComposite,
  jumpToRootHierarchy,
  navigateToParentHierarchy,
  regenerateProposalsForSelectedModule,
  canNavigateToParent,
  canEnterSelectedComposite
}: AppRibbonProps): JSX.Element {
  const hasModuleNameDraft = newModuleName.trim().length > 0;
  const selectedModuleIsVisible = visibleModules.some((moduleNode) => moduleNode.id === selectedModule?.id);
  const hasConnectionEndpoints = visibleModules.length > 1;
  const connectionSignal = connectionDraft.signal.trim();
  const canCommitConnection = Boolean(connectionDraft.fromModuleId && connectionDraft.toModuleId && connectionSignal);
  const activeWorkspaceLabel = getWorkspaceLabel(activeSecondaryWorkspace);

  const fileActions: MenuAction[] = [
    {
      label: 'Open project data',
      description: 'Open import/export workspace.',
      onClick: () => openSecondaryWorkspace('project_data')
    },
    {
      label: 'Close workspace',
      description: `Current: ${activeWorkspaceLabel}`,
      onClick: closeSecondaryWorkspace,
      disabled: activeSecondaryWorkspace === 'none'
    }
  ];

  const editActions: MenuAction[] = [
    {
      label: 'Package editor',
      description: 'Open structured package authoring.',
      onClick: () => openSecondaryWorkspace('package_editor')
    },
    {
      label: 'Use selected as source',
      description: 'Prime connection source from current selection.',
      onClick: useSelectedModuleAsConnectionSource,
      disabled: !selectedModuleIsVisible
    },
    {
      label: 'Refresh AI suggestions',
      description: 'Regenerate proposals for selection.',
      onClick: regenerateProposalsForSelectedModule
    }
  ];

  const insertActions: MenuAction[] = [
    {
      label: 'Add leaf block',
      description: 'Create a leaf in current scope.',
      onClick: createLeafModule,
      disabled: !hasModuleNameDraft
    },
    {
      label: 'Add composite block',
      description: 'Create a composite in current scope.',
      onClick: createCompositeModule,
      disabled: !hasModuleNameDraft
    }
  ];

  const viewActions: MenuAction[] = [
    {
      label: 'Set scope fit',
      description: diagramViewportMode === 'fit_scope' ? 'Active framing mode.' : 'Frame current hierarchy scope.',
      onClick: () => setDiagramViewportMode('fit_scope')
    },
    {
      label: 'Set selection focus',
      description: diagramViewportMode === 'focus_selection' ? 'Active framing mode.' : 'Center selected visible module.',
      onClick: () => setDiagramViewportMode('focus_selection')
    },
    {
      label: 'Set overview',
      description: diagramViewportMode === 'overview' ? 'Active framing mode.' : 'Show full diagram extent.',
      onClick: () => setDiagramViewportMode('overview')
    },
    {
      label: 'Collapse all bundles',
      description: 'Reset expanded edge bundles.',
      onClick: collapseAllEdgeBundles
    }
  ];

  const navigateActions: MenuAction[] = [
    {
      label: 'Go to root',
      description: 'Jump to top hierarchy scope.',
      onClick: jumpToRootHierarchy,
      disabled: Boolean(currentHierarchyModule && currentHierarchyRootModuleId === currentHierarchyModule.id)
    },
    {
      label: 'Back to parent',
      description: 'Step one scope up.',
      onClick: navigateToParentHierarchy,
      disabled: !canNavigateToParent
    },
    {
      label: 'Enter composite',
      description: 'Enter selected composite scope.',
      onClick: enterSelectedComposite,
      disabled: !canEnterSelectedComposite
    }
  ];

  return (
    <header className="app-ribbon" aria-label="Workspace command ribbon">
      <div className="menu-bar" role="menubar" aria-label="Workspace menu bar">
        <span className="menu-bar-title">Hardware Co-Design</span>
        <span className="menu-bar-context">Scope: {currentHierarchyModule?.name ?? 'workspace'} · Selection: {selectedModule?.name ?? 'None'} · Workspace: {activeWorkspaceLabel}</span>

        <details className="menu-group">
          <summary role="menuitem">File</summary>
          <div className="menu-panel" role="menu" aria-label="File menu">
            {fileActions.map((action) => <MenuActionButton key={action.label} action={action} />)}
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Edit</summary>
          <div className="menu-panel" role="menu" aria-label="Edit menu">
            {editActions.map((action) => <MenuActionButton key={action.label} action={action} />)}
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">View</summary>
          <div className="menu-panel" role="menu" aria-label="View menu">
            {viewActions.map((action) => <MenuActionButton key={action.label} action={action} />)}
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Insert</summary>
          <div className="menu-panel" role="menu" aria-label="Insert menu">
            <label className="field-label menu-input-label">
              New module name
              <input
                value={newModuleName}
                onChange={(event) => setNewModuleName(event.target.value)}
                placeholder="new module name"
                aria-label="New module name"
              />
            </label>
            {insertActions.map((action) => <MenuActionButton key={action.label} action={action} />)}
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Navigate</summary>
          <div className="menu-panel" role="menu" aria-label="Navigate menu">
            {navigateActions.map((action) => <MenuActionButton key={action.label} action={action} />)}
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Validation</summary>
          <div className="menu-panel" role="menu" aria-label="Validation menu">
            <MenuActionButton
              action={{
                label: 'Open validation workspace',
                description: 'Inspect semantic issues for selection.',
                onClick: () => openSecondaryWorkspace('validation')
              }}
            />
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Review</summary>
          <div className="menu-panel" role="menu" aria-label="Review menu">
            <MenuActionButton
              action={{
                label: 'Open review workspace',
                description: 'Open readiness + payload preview flow.',
                onClick: () => openSecondaryWorkspace('review')
              }}
            />
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Handoff</summary>
          <div className="menu-panel" role="menu" aria-label="Handoff menu">
            <MenuActionButton
              action={{
                label: 'Open handoff workspace',
                description: 'Launch provider execution tools.',
                onClick: () => openSecondaryWorkspace('handoff')
              }}
            />
          </div>
        </details>

        <details className="menu-group">
          <summary role="menuitem">Tools</summary>
          <div className="menu-panel" role="menu" aria-label="Tools menu">
            <div className="menu-form-grid">
              <label className="field-label menu-input-label">
                Source
                <select
                  value={connectionDraft.fromModuleId}
                  onChange={(event) => setConnectionDraft({ ...connectionDraft, fromModuleId: event.target.value })}
                  aria-label="Ribbon connection source"
                  disabled={!hasConnectionEndpoints}
                >
                  {visibleModules.map((moduleNode) => (
                    <option key={`ribbon-from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                  ))}
                </select>
              </label>
              <label className="field-label menu-input-label">
                Target
                <select
                  value={connectionDraft.toModuleId}
                  onChange={(event) => setConnectionDraft({ ...connectionDraft, toModuleId: event.target.value })}
                  aria-label="Ribbon connection target"
                  disabled={!hasConnectionEndpoints}
                >
                  {visibleModules.map((moduleNode) => (
                    <option key={`ribbon-to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field-label menu-input-label">
              Signal
              <input
                value={connectionDraft.signal}
                onChange={(event) => setConnectionDraft({ ...connectionDraft, signal: event.target.value })}
                placeholder="signal"
                aria-label="Ribbon connection signal"
                disabled={!hasConnectionEndpoints}
              />
            </label>
            <MenuActionButton
              action={{
                label: 'Connect now',
                description: 'Commit connection draft in current scope.',
                onClick: addConnection,
                disabled: !canCommitConnection || !hasConnectionEndpoints
              }}
            />
          </div>
        </details>
      </div>
    </header>
  );
}
