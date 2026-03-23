import { ValidationSummarySection } from '../modulePackagePanel/ValidationSummarySection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function ValidationWorkspace({ designHasValidationIssues, moduleValidationIssues }: SecondaryWorkspaceSharedProps): JSX.Element {
  return (
    <WorkspaceFrame
      title="Validation workspace"
      description="Focused semantic validation view for the selected module. Use this workspace to inspect blockers and warnings without opening the full package editor."
      statusChips={[
        designHasValidationIssues ? 'Design has open validation issues' : 'Design validation clean',
        moduleValidationIssues.length === 0 ? 'Selected module clean' : `${moduleValidationIssues.length} module issue${moduleValidationIssues.length === 1 ? '' : 's'}`
      ]}
    >
      <ValidationSummarySection
        designHasValidationIssues={designHasValidationIssues}
        moduleValidationIssues={moduleValidationIssues}
      />
    </WorkspaceFrame>
  );
}
