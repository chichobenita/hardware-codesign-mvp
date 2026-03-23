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
  if (activeWorkspace === 'none') {
    return (
      <section className="secondary-workspace-empty" aria-label="Secondary workspace launcher">
        <div>
          <p className="secondary-workspace-kicker">Secondary workspace</p>
          <h2>No deep-work surface open</h2>
          <p className="muted">Open package editing, review, handoff, validation, or project data intentionally from the ribbon or the launcher below.</p>
        </div>
        <div className="secondary-workspace-actions" aria-label="Secondary workspace quick launch">
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('package_editor')}>Package editor</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('review')}>Review</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('handoff')}>Handoff</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('validation')}>Validation</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('project_data')}>Project data</button>
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
          <p className="muted">Selection: <strong>{selectedModule?.name ?? 'None'}</strong> · Scope: <strong>{currentHierarchyModuleName ?? 'workspace'}</strong></p>
        </div>
        <div className="secondary-workspace-header-actions">
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('package_editor')}>Package</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('review')}>Review</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('handoff')}>Handoff</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('validation')}>Validation</button>
          <button type="button" className="secondary-workspace-button" onClick={() => onOpenWorkspace('project_data')}>Project data</button>
          <button type="button" className="secondary-workspace-button secondary-workspace-close" onClick={onClose}>Close</button>
        </div>
      </div>

      {activeWorkspace === 'package_editor' ? <PackageEditorWorkspace {...sharedProps} /> : null}
      {activeWorkspace === 'review' ? <ReviewWorkspace {...sharedProps} canShowPayloadPreview={canShowPayloadPreview} /> : null}
      {activeWorkspace === 'handoff' ? <HandoffWorkspace {...sharedProps} canShowPayloadPreview={canShowPayloadPreview} /> : null}
      {activeWorkspace === 'validation' ? <ValidationWorkspace {...sharedProps} /> : null}
      {activeWorkspace === 'project_data' ? <ProjectDataWorkspace {...sharedProps} /> : null}
    </section>
  );
}
