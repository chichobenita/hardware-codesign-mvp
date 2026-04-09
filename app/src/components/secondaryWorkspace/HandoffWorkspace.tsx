import { ArtifactHistorySection } from '../modulePackagePanel/ArtifactHistorySection';
import { HandoffSection } from '../modulePackagePanel/HandoffSection';
import { PromptPreviewSection } from '../modulePackagePanel/ReviewPreviewSections';
import { ValidationSummarySection } from '../modulePackagePanel/ValidationSummarySection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function HandoffWorkspace({
  state,
  handoffProviders,
  selectedProviderId,
  setSelectedProvider,
  approvedLeafReadyModules,
  currentProviderJob,
  latestHandoffArtifact,
  isSelectedModuleHandoffReady,
  hasCurrentSelectedArtifact,
  selectModule,
  markSelectedModuleAsHandedOff,
  exportLatestHandoffArtifact,
  handoffArtifacts,
  generatedPrompt,
  canShowPayloadPreview,
  isSelectedModuleValidForReviewOrHandoff,
  copyGeneratedPrompt,
  exportGeneratedPrompt,
  designHasValidationIssues,
  moduleValidationIssues
}: SecondaryWorkspaceSharedProps & { canShowPayloadPreview: boolean }): JSX.Element {
  return (
    <WorkspaceFrame
      title="Handoff workspace"
      description="Focused provider handoff surface for ready leaf modules, artifact inspection, local history, and prompt export."
      statusChips={[
        approvedLeafReadyModules.length === 0 ? 'No approved leaf modules yet' : `${approvedLeafReadyModules.length} approved leaf module${approvedLeafReadyModules.length === 1 ? '' : 's'}`,
        isSelectedModuleHandoffReady ? 'Selected module can hand off' : 'Selected module not handoff-ready',
        currentProviderJob ? `Provider job: ${currentProviderJob.status}` : 'No active provider job'
      ]}
    >
      <section className="project-transfer-card">
        <h3>Handoff provider</h3>
        <label>
          Handoff provider
          <select value={selectedProviderId} onChange={(event) => setSelectedProvider(event.target.value)} aria-label="Handoff provider">
            {handoffProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>{provider.label}</option>
            ))}
          </select>
        </label>
        <p className="muted">
          {handoffProviders.find((provider) => provider.id === selectedProviderId)?.description ?? 'Frontend-local mock provider.'}
        </p>
      </section>

      <ValidationSummarySection
        designHasValidationIssues={designHasValidationIssues}
        moduleValidationIssues={moduleValidationIssues}
      />

      <PromptPreviewSection
        canShowPayloadPreview={canShowPayloadPreview}
        isSelectedModuleValidForReviewOrHandoff={isSelectedModuleValidForReviewOrHandoff}
        generatedPrompt={generatedPrompt}
        copyGeneratedPrompt={copyGeneratedPrompt}
        exportGeneratedPrompt={exportGeneratedPrompt}
      />

      <HandoffSection
        state={state}
        approvedLeafReadyModules={approvedLeafReadyModules}
        currentProviderJob={currentProviderJob}
        latestHandoffArtifact={latestHandoffArtifact}
        isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
        hasCurrentSelectedArtifact={hasCurrentSelectedArtifact}
        selectModule={selectModule}
        markSelectedModuleAsHandedOff={markSelectedModuleAsHandedOff}
        exportLatestHandoffArtifact={exportLatestHandoffArtifact}
      />

      <ArtifactHistorySection handoffArtifacts={handoffArtifacts} />
    </WorkspaceFrame>
  );
}
