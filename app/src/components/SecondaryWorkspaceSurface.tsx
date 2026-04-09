import type { SecondaryWorkspace } from '../types';
import { HandoffWorkspace } from './secondaryWorkspace/HandoffWorkspace';
import { PackageEditorWorkspace } from './secondaryWorkspace/PackageEditorWorkspace';
import { ProjectDataWorkspace } from './secondaryWorkspace/ProjectDataWorkspace';
import { ReviewWorkspace } from './secondaryWorkspace/ReviewWorkspace';
import type { SecondaryWorkspaceSharedProps } from './secondaryWorkspace/types';
import { ValidationWorkspace } from './secondaryWorkspace/ValidationWorkspace';

type SecondaryWorkspaceSurfaceProps = SecondaryWorkspaceSharedProps & {
  activeWorkspace: SecondaryWorkspace;
  canShowPayloadPreview: boolean;
  currentHierarchyModuleName?: string;
  onClose: () => void;
  onOpenWorkspace: (workspace: Exclude<SecondaryWorkspace, 'none'>) => void;
};

type WorkspaceLauncher = {
  description: string;
  title: string;
  workspace: Exclude<SecondaryWorkspace, 'none'>;
};

const WORKSPACE_LAUNCHERS: WorkspaceLauncher[] = [
  {
    workspace: 'package_editor',
    title: 'Package editor',
    description: 'Structured authoring for the selected module package.'
  },
  {
    workspace: 'review',
    title: 'Review',
    description: 'Lifecycle readiness, diagnostics, payload, and prompt preview.'
  },
  {
    workspace: 'handoff',
    title: 'Handoff',
    description: 'Provider execution, artifact history, and export tools.'
  },
  {
    workspace: 'validation',
    title: 'Validation',
    description: 'Focused semantic diagnostics without opening the full editor.'
  },
  {
    workspace: 'project_data',
    title: 'Project data',
    description: 'Import or export the full design snapshot.'
  }
];

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
      return 'Secondary workspace';
  }
}

export function SecondaryWorkspaceSurface({
  activeWorkspace,
  selectedModule,
  currentHierarchyModuleName,
  onClose,
  onOpenWorkspace,
  canShowPayloadPreview,
  ...sharedProps
}: SecondaryWorkspaceSurfaceProps): JSX.Element {
  const selectedModuleName = selectedModule?.name ?? 'None';
  const validationSummary = sharedProps.moduleValidationIssues.length === 0
    ? 'Validation clean'
    : `${sharedProps.moduleValidationIssues.length} validation issue${sharedProps.moduleValidationIssues.length === 1 ? '' : 's'}`;
  const reviewSummary = sharedProps.isSelectedModuleValidForReviewOrHandoff
    ? 'Review payloads available'
    : 'Review remains gated by readiness';
  const handoffSummary = sharedProps.isSelectedModuleHandoffReady
    ? 'Ready for handoff flow'
    : 'Handoff remains gated';

  if (activeWorkspace === 'none') {
    return (
      <section className="secondary-workspace-empty" aria-label="Secondary workspace launcher">
        <div>
          <p className="secondary-workspace-kicker">Secondary workspace</p>
          <h2>No deep-work surface open</h2>
          <p className="muted">Open package editing, review, handoff, validation, or project data intentionally from the ribbon or the launcher below.</p>
        </div>
        <div className="secondary-workspace-meta" aria-label="Secondary workspace readiness summary">
          <span className="secondary-workspace-chip">Selection: {selectedModuleName}</span>
          <span className="secondary-workspace-chip">{validationSummary}</span>
          <span className="secondary-workspace-chip">{reviewSummary}</span>
          <span className="secondary-workspace-chip">{handoffSummary}</span>
        </div>
        <div className="secondary-workspace-launcher-grid" aria-label="Secondary workspace quick launch">
          {WORKSPACE_LAUNCHERS.map((launcher) => (
            <button
              key={launcher.workspace}
              type="button"
              className="secondary-workspace-launcher"
              aria-label={launcher.title}
              onClick={() => onOpenWorkspace(launcher.workspace)}
            >
              <strong>{launcher.title}</strong>
              <span>{launcher.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="secondary-workspace-shell" aria-label="Secondary workspace surface">
      <div className="secondary-workspace-header">
        <div>
          <p className="secondary-workspace-kicker">Focused deep-work surface</p>
          <h2>{getWorkspaceLabel(activeWorkspace)}</h2>
          <p className="muted">Selection: <strong>{selectedModuleName}</strong> · Scope: <strong>{currentHierarchyModuleName ?? 'workspace'}</strong></p>
        </div>
        <div className="secondary-workspace-header-actions">
          {WORKSPACE_LAUNCHERS.map((launcher) => (
            <button
              key={launcher.workspace}
              type="button"
              className={launcher.workspace === activeWorkspace ? 'secondary-workspace-button active' : 'secondary-workspace-button'}
              aria-pressed={launcher.workspace === activeWorkspace}
              onClick={() => onOpenWorkspace(launcher.workspace)}
            >
              {launcher.title}
            </button>
          ))}
          <button type="button" className="secondary-workspace-button secondary-workspace-close" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="secondary-workspace-meta" aria-label="Secondary workspace state summary">
        <span className="secondary-workspace-chip">{validationSummary}</span>
        <span className="secondary-workspace-chip">{reviewSummary}</span>
        <span className="secondary-workspace-chip">{handoffSummary}</span>
      </div>

      {activeWorkspace === 'package_editor' ? <PackageEditorWorkspace {...sharedProps} /> : null}
      {activeWorkspace === 'review' ? <ReviewWorkspace {...sharedProps} canShowPayloadPreview={canShowPayloadPreview} /> : null}
      {activeWorkspace === 'handoff' ? <HandoffWorkspace {...sharedProps} canShowPayloadPreview={canShowPayloadPreview} /> : null}
      {activeWorkspace === 'validation' ? <ValidationWorkspace {...sharedProps} /> : null}
      {activeWorkspace === 'project_data' ? <ProjectDataWorkspace {...sharedProps} /> : null}
    </section>
  );
}
