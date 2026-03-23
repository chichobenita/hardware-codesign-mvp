import { ProjectTransferSection } from '../modulePackagePanel/ProjectTransferSection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function ProjectDataWorkspace({ state, exportCurrentProject, importProjectFromFile }: SecondaryWorkspaceSharedProps): JSX.Element {
  return (
    <WorkspaceFrame
      title="Project data workspace"
      description="Import and export the full project JSON snapshot without mixing those controls into package editing, review, or handoff flows."
    >
      <ProjectTransferSection
        projectImportError={state.ui.projectImportError}
        exportCurrentProject={exportCurrentProject}
        importProjectFromFile={importProjectFromFile}
      />
    </WorkspaceFrame>
  );
}
