import { PackageLifecycleSection } from '../modulePackagePanel/PackageLifecycleSection';
import { PayloadPreviewSection, PromptPreviewSection } from '../modulePackagePanel/ReviewPreviewSections';
import { ValidationSummarySection } from '../modulePackagePanel/ValidationSummarySection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function ReviewWorkspace({
  currentPackageContent,
  transitionReadiness,
  moveToNextPackageState,
  canShowPayloadPreview,
  isSelectedModuleValidForReviewOrHandoff,
  generatedPayload,
  generatedPrompt,
  copyGeneratedPrompt,
  exportGeneratedPrompt,
  designHasValidationIssues,
  moduleValidationIssues
}: SecondaryWorkspaceSharedProps & { canShowPayloadPreview: boolean }): JSX.Element {
  return (
    <WorkspaceFrame
      title="Review workspace"
      description="Focused readiness review for the selected module, with lifecycle state, semantic diagnostics, payload preview, and prompt preview."
      statusChips={[
        `Package: ${currentPackageContent.packageStatus}`,
        isSelectedModuleValidForReviewOrHandoff ? 'Review payloads unlocked' : 'Review remains gated',
        designHasValidationIssues ? 'Design has open validation issues' : 'Design validation clean'
      ]}
    >
      <PackageLifecycleSection
        packageStatus={currentPackageContent.packageStatus}
        transitionReadiness={transitionReadiness}
        moveToNextPackageState={moveToNextPackageState}
      />

      <ValidationSummarySection
        designHasValidationIssues={designHasValidationIssues}
        moduleValidationIssues={moduleValidationIssues}
      />

      <PayloadPreviewSection
        canShowPayloadPreview={canShowPayloadPreview}
        isSelectedModuleValidForReviewOrHandoff={isSelectedModuleValidForReviewOrHandoff}
        generatedPayload={generatedPayload}
      />

      <PromptPreviewSection
        canShowPayloadPreview={canShowPayloadPreview}
        isSelectedModuleValidForReviewOrHandoff={isSelectedModuleValidForReviewOrHandoff}
        generatedPrompt={generatedPrompt}
        copyGeneratedPrompt={copyGeneratedPrompt}
        exportGeneratedPrompt={exportGeneratedPrompt}
      />
    </WorkspaceFrame>
  );
}
