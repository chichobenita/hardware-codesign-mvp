import { ValidationSummarySection } from '../modulePackagePanel/ValidationSummarySection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function ValidationWorkspace({ designHasValidationIssues, moduleValidationIssues }: SecondaryWorkspaceSharedProps): JSX.Element {
  return (
    <WorkspaceFrame
      title="Validation workspace"
      description="Focused semantic validation view for the selected module. Use this workspace to inspect blockers and warnings without opening the full package editor."
    >
      <ValidationSummarySection
        designHasValidationIssues={designHasValidationIssues}
        moduleValidationIssues={moduleValidationIssues}
      />
    </WorkspaceFrame>
  );
}
