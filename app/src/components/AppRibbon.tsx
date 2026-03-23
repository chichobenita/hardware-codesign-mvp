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
    >
      <strong>{action.label}</strong>
      <span aria-hidden="true">{action.description}</span>
      {action.shortcut ? <span className="ribbon-shortcut" aria-hidden="true">{action.shortcut}</span> : null}
    </button>
  );
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

  const workspaceActions: Array<CommandAction & { workspace: Exclude<SecondaryWorkspace, 'none'> }> = [
    {
      label: 'Package',
      description: 'Open structured package authoring for the selection.',
      shortcut: 'Cmd/Ctrl+Shift+P',
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
          Stage 5 turns the ribbon into a real command surface for insert, connect, view, navigation, validation, review, and AI-assisted workflow entry.
        </p>
      </div>

      <div className="ribbon-groups">
        <section className="ribbon-group" aria-label="Project context">
          <span className="ribbon-group-label">Project</span>
          <div className="ribbon-chip-row">
            <span className="ribbon-chip">Scope: {currentHierarchyModule?.name ?? 'workspace'}</span>
            <span className="ribbon-chip">Selection: {selectedModule?.name ?? 'None'}</span>
            <span className="ribbon-chip">Secondary workspace: {activeSecondaryWorkspace === 'none' ? 'closed' : activeSecondaryWorkspace}</span>
          </div>
          <div className="ribbon-action-row">
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={() => openSecondaryWorkspace('project_data')}>
              Project data
            </button>
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={closeSecondaryWorkspace}>
              Close workspace
            </button>
          </div>
        </section>

        <section className="ribbon-group" aria-label="Insert commands">
          <span className="ribbon-group-label">Insert</span>
          <div className="ribbon-command-input-row">
            <input
              value={newModuleName}
              onChange={(event) => setNewModuleName(event.target.value)}
              placeholder="new module name"
              aria-label="New module name"
            />
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
            <select
              value={connectionDraft.fromModuleId}
              onChange={(event) => setConnectionDraft({ ...connectionDraft, fromModuleId: event.target.value })}
              aria-label="Ribbon connection source"
            >
              {visibleModules.map((moduleNode) => (
                <option key={`ribbon-from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
              ))}
            </select>
            <select
              value={connectionDraft.toModuleId}
              onChange={(event) => setConnectionDraft({ ...connectionDraft, toModuleId: event.target.value })}
              aria-label="Ribbon connection target"
            >
              {visibleModules.map((moduleNode) => (
                <option key={`ribbon-to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
              ))}
            </select>
            <input
              value={connectionDraft.signal}
              onChange={(event) => setConnectionDraft({ ...connectionDraft, signal: event.target.value })}
              placeholder="signal"
              aria-label="Ribbon connection signal"
            />
          </div>
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
              disabled={!connectionDraft.signal.trim()}
              onClick={addConnection}
            />
          </div>
        </section>

        <section className="ribbon-group" aria-label="View commands">
          <span className="ribbon-group-label">View</span>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Scope fit', description: 'Frame the current hierarchy scope.', shortcut: 'Cmd/Ctrl+1' }}
              isActive={diagramViewportMode === 'fit_scope'}
              compact
              onClick={() => setDiagramViewportMode('fit_scope')}
            />
            <RibbonCommandButton
              action={{ label: 'Selection focus', description: 'Center the selected visible block.', shortcut: 'Cmd/Ctrl+2' }}
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
              disabled={!currentHierarchyRootModuleId}
              onClick={jumpToRootHierarchy}
            />
            <RibbonCommandButton
              action={{ label: 'Up to parent', description: 'Move one scope up.', shortcut: 'Cmd/Ctrl+↑' }}
              isActive={false}
              compact
              disabled={!canNavigateToParent}
              onClick={navigateToParentHierarchy}
            />
            <RibbonCommandButton
              action={{ label: 'Enter composite', description: 'Enter the selected composite module.', shortcut: 'Cmd/Ctrl+Enter' }}
              isActive={false}
              compact
              disabled={!canEnterSelectedComposite}
              onClick={enterSelectedComposite}
            />
          </div>
        </section>

        <section className="ribbon-group ribbon-group-workspaces" aria-label="Review and workflow commands">
          <span className="ribbon-group-label">Review / Handoff</span>
          <div className="ribbon-command-grid ribbon-command-grid-wide">
            {workspaceActions.map((action) => (
              <RibbonCommandButton
                key={action.workspace}
                action={action}
                isActive={activeSecondaryWorkspace === action.workspace}
                compact
                onClick={() => openSecondaryWorkspace(action.workspace)}
              />
            ))}
          </div>

          <div className="ribbon-action-row">
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={() => openSecondaryWorkspace('project_data')}>
              Open project utility
            </button>
          </div>
        </section>

        <section className="ribbon-group" aria-label="AI commands">
          <span className="ribbon-group-label">AI</span>
          <div className="ribbon-command-grid">
            <RibbonCommandButton
              action={{ label: 'Refresh ideas', description: 'Regenerate proposal cards for the selected module.' }}
              isActive={false}
              compact
              disabled={!selectedModule}
              onClick={regenerateProposalsForSelectedModule}
            />
          </div>
        </section>
      </div>
    </header>
  );
}
