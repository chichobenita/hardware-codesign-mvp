import type { ModuleNode } from '../../../shared/src';
import type { SecondaryWorkspace } from '../types';

type AppRibbonProps = {
  selectedModule?: ModuleNode;
  currentHierarchyModule?: ModuleNode;
  activeSecondaryWorkspace: SecondaryWorkspace;
  openSecondaryWorkspace: (workspace: Exclude<SecondaryWorkspace, 'none'>) => void;
  closeSecondaryWorkspace: () => void;
  enterSelectedComposite: () => void;
  navigateToParentHierarchy: () => void;
  canNavigateToParent: boolean;
  canEnterSelectedComposite: boolean;
};

type WorkspaceAction = {
  description: string;
  label: string;
  workspace: Exclude<SecondaryWorkspace, 'none'>;
};

function RibbonWorkspaceButton({
  action,
  isActive,
  onClick
}: {
  action: WorkspaceAction;
  isActive: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={isActive ? 'ribbon-button ribbon-button-active' : 'ribbon-button'}
      onClick={onClick}
    >
      <strong>{action.label}</strong>
      <span>{action.description}</span>
    </button>
  );
}

export function AppRibbon({
  selectedModule,
  currentHierarchyModule,
  activeSecondaryWorkspace,
  openSecondaryWorkspace,
  closeSecondaryWorkspace,
  enterSelectedComposite,
  navigateToParentHierarchy,
  canNavigateToParent,
  canEnterSelectedComposite
}: AppRibbonProps): JSX.Element {
  const workspaceActions: WorkspaceAction[] = [
    {
      label: 'Package editor',
      description: 'Structured package authoring and decomposition editing for the selected module.',
      workspace: 'package_editor'
    },
    {
      label: 'Review',
      description: 'Focused readiness review with validation and derived previews.',
      workspace: 'review'
    },
    {
      label: 'Handoff',
      description: 'Provider-facing handoff execution, artifact history, and export context.',
      workspace: 'handoff'
    },
    {
      label: 'Validation',
      description: 'Selected-module semantic diagnostics without opening the full package editor.',
      workspace: 'validation'
    },
    {
      label: 'Project data',
      description: 'Import and export the full project JSON snapshot in a dedicated utility surface.',
      workspace: 'project_data'
    }
  ];

  return (
    <header className="app-ribbon" aria-label="Workspace command ribbon">
      <div className="ribbon-title-group">
        <p className="ribbon-kicker">Hardware Co-Design Platform</p>
        <h1>Workspace redesign shell</h1>
        <p className="muted">
          Stage 2 formalizes dedicated secondary workspaces so package editing, review, handoff, validation, and project data no longer live inside one bundled dock.
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
          <div className="ribbon-workspace-grid ribbon-workspace-grid-wide">
            {workspaceActions.map((action) => (
              <RibbonWorkspaceButton
                key={action.workspace}
                action={action}
                isActive={activeSecondaryWorkspace === action.workspace}
                onClick={() => openSecondaryWorkspace(action.workspace)}
              />
            ))}
          </div>
          <div className="ribbon-action-row">
            <button type="button" className="ribbon-button ribbon-button-compact" onClick={closeSecondaryWorkspace}>
              Close secondary workspace
            </button>
          </div>
        </section>
      </div>
    </header>
  );
}
