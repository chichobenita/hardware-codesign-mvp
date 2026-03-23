import type { ModuleNode } from '../../../shared/src';
import type { WorkspaceMode } from '../types';

type SecondaryWorkspaceDockProps = {
  selectedModule?: ModuleNode;
  currentHierarchyModule?: ModuleNode;
  workspaceMode: WorkspaceMode;
  openPackageEditor: () => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  children: JSX.Element;
};

function getWorkspaceCopy(workspaceMode: WorkspaceMode) {
  if (workspaceMode === 'review') {
    return {
      title: 'Secondary workspace — Review',
      description: 'Focused review mode stays in a transitional dock during Stage 1 so readiness checks and previews remain available without keeping a fixed right column.'
    };
  }

  if (workspaceMode === 'handoff') {
    return {
      title: 'Secondary workspace — Handoff',
      description: 'Focused handoff mode remains available through the new shell while artifact execution and history stay hosted in the transitional dock.'
    };
  }

  return {
    title: 'Secondary workspace — Package editor',
    description: 'Structured package editing, validation, project transfer, and decomposition controls remain available in a transitional dock until Stage 2 splits them into dedicated workspaces.'
  };
}

export function SecondaryWorkspaceDock({
  selectedModule,
  currentHierarchyModule,
  workspaceMode,
  openPackageEditor,
  setWorkspaceMode,
  children
}: SecondaryWorkspaceDockProps): JSX.Element {
  const copy = getWorkspaceCopy(workspaceMode);

  return (
    <section className="secondary-workspace-dock" aria-label="Secondary workspace dock">
      <div className="secondary-workspace-header">
        <div>
          <p className="secondary-workspace-kicker">Contextual deep-work surface</p>
          <h2>{copy.title}</h2>
          <p className="muted">{copy.description}</p>
        </div>
        <div className="secondary-workspace-meta">
          <span className="secondary-workspace-chip">Selection: {selectedModule?.name ?? 'None'}</span>
          <span className="secondary-workspace-chip">Scope: {currentHierarchyModule?.name ?? 'workspace'}</span>
        </div>
      </div>

      <div className="secondary-workspace-actions" aria-label="Secondary workspace entry points">
        <button type="button" className={workspaceMode === 'design' ? 'secondary-workspace-button active' : 'secondary-workspace-button'} onClick={openPackageEditor}>
          Package editor
        </button>
        <button type="button" className={workspaceMode === 'review' ? 'secondary-workspace-button active' : 'secondary-workspace-button'} onClick={() => setWorkspaceMode('review')}>
          Review
        </button>
        <button type="button" className={workspaceMode === 'handoff' ? 'secondary-workspace-button active' : 'secondary-workspace-button'} onClick={() => setWorkspaceMode('handoff')}>
          Handoff
        </button>
      </div>

      <div className="secondary-workspace-content">{children}</div>
    </section>
  );
}
