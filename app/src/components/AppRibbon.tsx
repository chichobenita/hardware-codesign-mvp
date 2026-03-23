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

type CommandAction = {
  description: string;
  label: string;
  shortcut?: string;
};

function RibbonCommandButton({
  action,
  isActive,
  compact = false,
  disabled = false,
  onClick
}: {
  action: CommandAction;
  isActive: boolean;
  compact?: boolean;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={[
        'ribbon-button',
        compact ? 'ribbon-button-compact-command' : '',
        isActive ? 'ribbon-button-active' : ''
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={action.label}
      aria-pressed={isActive}
    >
      <strong>{action.label}</strong>
      <span>{action.description}</span>
      {action.shortcut ? <span className="ribbon-shortcut" aria-hidden="true">{action.shortcut}</span> : null}
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
      return 'Closed';
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

  const workspaceActions: Array<CommandAction & { workspace: Exclude<SecondaryWorkspace, 'none'> }> = [
    {
      label: 'Package',
      description: 'Open structured package authoring for the selection.',
      workspace: 'package_editor'
    },
    {
      label: 'Validation',
      description: 'Inspect semantic issues for the active module.',
      workspace: 'validation'
    },
    {
      label: 'Review',
      description: 'Open the focused readiness review workspace.',
      workspace: 'review'
    },
    {
      label: 'Handoff',
      description: 'Open provider-facing handoff tools.',
      workspace: 'handoff'
    }
  ];

  return (
    <header className="app-ribbon" aria-label="Workspace command ribbon">
      <div className="ribbon-title-group">
        <p className="ribbon-kicker">Hardware Co-Design Platform</p>
        <h1>Workspace redesign shell</h1>
        <p className="muted">
          Stage 6 tightens the Stage 5 shell with clearer command states, polished deep-work integration, and stronger baseline accessibility without changing the reducer-driven workspace model.
        </p>
      </div>

      <div className="ribbon-groups">
        <section className="ribbon-group" aria-label="Project context">
          <span className="ribbon-group-label">Project</span>
          <div className="ribbon-chip-row">
            <span className="ribbon-chip">Scope: {currentHierarchyModule?.name ?? 'workspace'}</span>
            <span className="ribbon-chip">Selection: {selectedModule?.name ?? 'None'}</span>
            <span className="ribbon-chip">Workspace: {activeWorkspaceLabel}</span>
          </div>
          <p className="ribbon-footnote muted">
            The ribbon launches focused secondary workspaces while keeping the current hierarchy scope and selection intact.
          </p>
          <div className="ribbon-action-row">
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={() => openSecondaryWorkspace('project_data')}>
              Project data
            </button>
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={closeSecondaryWorkspace} disabled={activeSecondaryWorkspace === 'none'}>
              Close workspace
            </button>
          </div>
        </section>

        <section className="ribbon-group" aria-label="Insert commands">
          <span className="ribbon-group-label">Insert</span>
          <div className="ribbon-command-input-row">
            <label className="field-label">
              New module name
              <input
                value={newModuleName}
                onChange={(event) => setNewModuleName(event.target.value)}
                placeholder="new module name"
                aria-label="New module name"
              />
            </label>
            <p className="ribbon-footnote muted">Name the block first, then choose whether it should start as a leaf or a composite container.</p>
          </div>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Add leaf block', description: 'Create a leaf module in the current scope.', shortcut: 'Cmd/Ctrl+Shift+L' }}
              isActive={false}
              compact
              disabled={!hasModuleNameDraft}
              onClick={createLeafModule}
            />
            <RibbonCommandButton
              action={{ label: 'Add composite', description: 'Create a composite module in the current scope.', shortcut: 'Cmd/Ctrl+Shift+C' }}
              isActive={false}
              compact
              disabled={!hasModuleNameDraft}
              onClick={createCompositeModule}
            />
          </div>
        </section>

        <section className="ribbon-group" aria-label="Connect commands">
          <span className="ribbon-group-label">Connect</span>
          <div className="ribbon-connection-grid">
            <label className="field-label">
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
            <label className="field-label">
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
            <label className="field-label">
              Signal
              <input
                value={connectionDraft.signal}
                onChange={(event) => setConnectionDraft({ ...connectionDraft, signal: event.target.value })}
                placeholder="signal"
                aria-label="Ribbon connection signal"
                disabled={!hasConnectionEndpoints}
              />
            </label>
          </div>
          <p className="ribbon-footnote muted">
            {hasConnectionEndpoints
              ? 'Pick two visible blocks and a signal name, or prime the source from the current selection.'
              : 'Connection commands unlock when the current scope shows at least two visible modules.'}
          </p>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Use selected as source', description: 'Prime the connection draft from the selected visible block.' }}
              isActive={selectedModuleIsVisible}
              compact
              disabled={!selectedModuleIsVisible}
              onClick={useSelectedModuleAsConnectionSource}
            />
            <RibbonCommandButton
              action={{ label: 'Connect now', description: 'Commit the current connection draft in this scope.', shortcut: 'Cmd/Ctrl+Shift+K' }}
              isActive={false}
              compact
              disabled={!canCommitConnection || !hasConnectionEndpoints}
              onClick={addConnection}
            />
          </div>
        </section>

        <section className="ribbon-group" aria-label="View commands">
          <span className="ribbon-group-label">View</span>
          <p className="ribbon-footnote muted">Viewport framing is reducer-owned so the shell, shortcuts, and diagram controls always stay in sync.</p>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Scope fit', description: 'Frame the current hierarchy scope.', shortcut: 'Cmd/Ctrl+1' }}
              isActive={diagramViewportMode === 'fit_scope'}
              compact
              onClick={() => setDiagramViewportMode('fit_scope')}
            />
            <RibbonCommandButton
              action={{ label: 'Selection focus', description: selectedModuleIsVisible ? 'Center the selected visible block.' : 'Focus falls back to the current scope when the selection is outside view.', shortcut: 'Cmd/Ctrl+2' }}
              isActive={diagramViewportMode === 'focus_selection'}
              compact
              onClick={() => setDiagramViewportMode('focus_selection')}
            />
            <RibbonCommandButton
              action={{ label: 'Canvas overview', description: 'Show the full current diagram layout.', shortcut: 'Cmd/Ctrl+3' }}
              isActive={diagramViewportMode === 'overview'}
              compact
              onClick={() => setDiagramViewportMode('overview')}
            />
            <RibbonCommandButton
              action={{ label: 'Collapse edge bundles', description: 'Return expanded edge bundles to their grouped state.' }}
              isActive={false}
              compact
              onClick={collapseAllEdgeBundles}
            />
          </div>
        </section>

        <section className="ribbon-group" aria-label="Navigate commands">
          <span className="ribbon-group-label">Navigate</span>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Go to root', description: 'Jump to the top-level hierarchy scope.' }}
              isActive={Boolean(currentHierarchyModule && currentHierarchyRootModuleId === currentHierarchyModule.id)}
              compact
              onClick={jumpToRootHierarchy}
            />
            <RibbonCommandButton
              action={{ label: 'Back to parent', description: 'Step up one hierarchy level.', shortcut: 'Cmd/Ctrl+↑' }}
              isActive={false}
              compact
              disabled={!canNavigateToParent}
              onClick={navigateToParentHierarchy}
            />
            <RibbonCommandButton
              action={{ label: 'Enter composite', description: 'Open the selected composite scope.', shortcut: 'Cmd/Ctrl+Enter' }}
              isActive={false}
              compact
              disabled={!canEnterSelectedComposite}
              onClick={enterSelectedComposite}
            />
            <RibbonCommandButton
              action={{ label: 'Refresh AI suggestions', description: 'Rebuild mock proposals for the current selection.' }}
              isActive={false}
              compact
              onClick={regenerateProposalsForSelectedModule}
            />
          </div>
        </section>

        <section className="ribbon-group" aria-label="Focused workspace commands">
          <span className="ribbon-group-label">Focused workspaces</span>
          <div className="ribbon-workspace-grid ribbon-workspace-grid-wide">
            {workspaceActions.map((workspaceAction) => (
              <RibbonCommandButton
                key={workspaceAction.workspace}
                action={workspaceAction}
                isActive={activeSecondaryWorkspace === workspaceAction.workspace}
                compact
                onClick={() => openSecondaryWorkspace(workspaceAction.workspace)}
              />
            ))}
            <RibbonCommandButton
              action={{ label: 'Project data', description: 'Import or export the full project snapshot.' }}
              isActive={activeSecondaryWorkspace === 'project_data'}
              compact
              onClick={() => openSecondaryWorkspace('project_data')}
            />
          </div>
          <p className="ribbon-footnote muted">Open a task surface when you need detail, then return to the diagram with scope and selection preserved.</p>
        </section>
      </div>
    </header>
  );
}
