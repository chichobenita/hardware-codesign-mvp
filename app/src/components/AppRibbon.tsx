import type { ModuleNode } from '../../../shared/src';
import type { WorkspaceMode } from '../types';

type AppRibbonProps = {
  selectedModule?: ModuleNode;
  currentHierarchyModule?: ModuleNode;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  openPackageEditor: () => void;
  enterSelectedComposite: () => void;
  navigateToParentHierarchy: () => void;
  canNavigateToParent: boolean;
  canEnterSelectedComposite: boolean;
};

type WorkspaceAction = {
  description: string;
  isActive: boolean;
  label: string;
  onClick: () => void;
};

function RibbonWorkspaceButton({ action }: { action: WorkspaceAction }): JSX.Element {
  return (
    <button
      type="button"
      className={action.isActive ? 'ribbon-button ribbon-button-active' : 'ribbon-button'}
      onClick={action.onClick}
    >
      <strong>{action.label}</strong>
      <span>{action.description}</span>
    </button>
  );
}

export function AppRibbon({
  selectedModule,
  currentHierarchyModule,
  workspaceMode,
  setWorkspaceMode,
  openPackageEditor,
  enterSelectedComposite,
  navigateToParentHierarchy,
  canNavigateToParent,
  canEnterSelectedComposite
}: AppRibbonProps): JSX.Element {
  const workspaceActions: WorkspaceAction[] = [
    {
      label: 'Package editor',
      description: 'Transitional secondary workspace dock for structured package editing.',
      isActive: workspaceMode === 'design',
      onClick: openPackageEditor
    },
    {
      label: 'Review',
      description: 'Open the focused review surface for readiness and preview checks.',
      isActive: workspaceMode === 'review',
      onClick: () => setWorkspaceMode('review')
    },
    {
      label: 'Handoff',
      description: 'Open the focused handoff surface for provider execution and artifact tracking.',
      isActive: workspaceMode === 'handoff',
      onClick: () => setWorkspaceMode('handoff')
    }
  ];

  return (
    <header className="app-ribbon" aria-label="Workspace command ribbon">
      <div className="ribbon-title-group">
        <p className="ribbon-kicker">Hardware Co-Design Platform</p>
        <h1>Workspace redesign shell</h1>
        <p className="muted">
          Stage 1 introduces a ribbon-led shell, persistent AI sidebar, dominant diagram canvas, and a transitional secondary workspace dock.
        </p>
      </div>

      <div className="ribbon-groups">
        <section className="ribbon-group" aria-label="Project context">
          <span className="ribbon-group-label">Project</span>
          <div className="ribbon-chip-row">
            <span className="ribbon-chip">Scope: {currentHierarchyModule?.name ?? 'workspace'}</span>
            <span className="ribbon-chip">Selection: {selectedModule?.name ?? 'None'}</span>
          </div>
        </section>

        <section className="ribbon-group" aria-label="Navigate commands">
          <span className="ribbon-group-label">Navigate</span>
          <div className="ribbon-action-row">
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={navigateToParentHierarchy} disabled={!canNavigateToParent}>
              Up to parent
            </button>
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={enterSelectedComposite} disabled={!canEnterSelectedComposite}>
              Enter composite
            </button>
          </div>
        </section>

        <section className="ribbon-group ribbon-group-workspaces" aria-label="Secondary workspace commands">
          <span className="ribbon-group-label">Secondary workspaces</span>
          <div className="ribbon-workspace-grid">
            {workspaceActions.map((action) => <RibbonWorkspaceButton key={action.label} action={action} />)}
          </div>
          <p className="ribbon-footnote muted">Validation and project data remain in the transitional package dock for Stage 1 and move out in Stage 2.</p>
        </section>
      </div>
    </header>
  );
}
