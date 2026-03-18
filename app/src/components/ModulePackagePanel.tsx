import type { GenerationPayloadMinimal, ModulePackage, SemanticValidationIssue } from '../../../shared/src';
import type { HandoffArtifact } from '../ai/handoffTypes';
import type { HandoffProvider } from '../ai/providers/providerTypes';
import type { PromptBuildResult } from '../ai/promptTypes';
import type { TransitionReadiness } from '../packageLifecycle';
import type { ModuleKind, ModuleNode } from '../../../shared/src';
import type { Connection, DesignState, PackageSectionStatus, SectionKey, WorkspaceMode } from '../types';
import { ArtifactHistorySection } from './modulePackagePanel/ArtifactHistorySection';
import { DecompositionSection } from './modulePackagePanel/DecompositionSection';
import { HandoffSection } from './modulePackagePanel/HandoffSection';
import { PackageEditorSection } from './modulePackagePanel/PackageEditorSection';
import { PackageLifecycleSection } from './modulePackagePanel/PackageLifecycleSection';
import { PanelControlsSection } from './modulePackagePanel/PanelControlsSection';
import { ProjectTransferSection } from './modulePackagePanel/ProjectTransferSection';
import { PayloadPreviewSection, PromptPreviewSection } from './modulePackagePanel/ReviewPreviewSections';
import { ValidationSummarySection } from './modulePackagePanel/ValidationSummarySection';

type ModulePackagePanelProps = {
  selectedModule?: ModuleNode;
  state: DesignState;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  handoffProviders: HandoffProvider[];
  selectedProviderId: string;
  setSelectedProvider: (providerId: string) => void;
  currentPackageContent: ModulePackage;
  transitionReadiness: TransitionReadiness | null;
  moveToNextPackageState: () => void;
  currentSectionStatuses: Record<SectionKey, PackageSectionStatus>;
  updateCurrentPackage: (updater: (current: ModulePackage) => ModulePackage) => void;
  moduleConnections: Connection[];
  canShowPayloadPreview: boolean;
  generatedPayload: GenerationPayloadMinimal;
  generatedPrompt: PromptBuildResult | null;
  handoffArtifacts: HandoffArtifact[];
  latestHandoffArtifact: HandoffArtifact | null;
  copyGeneratedPrompt: () => Promise<void>;
  exportGeneratedPrompt: () => void;
  exportLatestHandoffArtifact: () => void;
  approvedLeafReadyModules: ModuleNode[];
  selectModule: (moduleId: string) => void;
  markSelectedModuleAsHandedOff: () => void;
  exportCurrentProject: () => void;
  importProjectFromFile: (file: File | null) => Promise<void>;
  isSelectedModuleHandoffReady: boolean;
  hasCurrentSelectedArtifact: boolean;
  moduleValidationIssues: SemanticValidationIssue[];
  designHasValidationIssues: boolean;
  isSelectedModuleValidForReviewOrHandoff: boolean;
  currentHierarchyModule?: ModuleNode;
  decompositionDraftNamesText: string;
  decompositionDraftChildKind: ModuleKind;
  setDecompositionNamesText: (value: string) => void;
  setDecompositionChildKind: (value: ModuleKind) => void;
  decomposeSelectedModule: () => void;
};

export function ModulePackagePanel({
  selectedModule,
  state,
  setWorkspaceMode,
  handoffProviders,
  selectedProviderId,
  setSelectedProvider,
  currentPackageContent,
  transitionReadiness,
  moveToNextPackageState,
  currentSectionStatuses,
  updateCurrentPackage,
  moduleConnections,
  canShowPayloadPreview,
  generatedPayload,
  generatedPrompt,
  handoffArtifacts,
  latestHandoffArtifact,
  copyGeneratedPrompt,
  exportGeneratedPrompt,
  exportLatestHandoffArtifact,
  approvedLeafReadyModules,
  selectModule,
  markSelectedModuleAsHandedOff,
  exportCurrentProject,
  importProjectFromFile,
  isSelectedModuleHandoffReady,
  hasCurrentSelectedArtifact,
  moduleValidationIssues,
  designHasValidationIssues,
  isSelectedModuleValidForReviewOrHandoff,
  currentHierarchyModule,
  decompositionDraftNamesText,
  decompositionDraftChildKind,
  setDecompositionNamesText,
  setDecompositionChildKind,
  decomposeSelectedModule
}: ModulePackagePanelProps): JSX.Element {
  const isReviewOrHandoffMode = state.ui.workspaceMode === 'review' || state.ui.workspaceMode === 'handoff';
  const isHandoffMode = state.ui.workspaceMode === 'handoff';

  return (
    <section className="panel right-panel">
      <h2>Module Package</h2>

      <PanelControlsSection
        selectedModule={selectedModule}
        selectedModuleId={state.selectedModuleId}
        workspaceMode={state.ui.workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
        handoffProviders={handoffProviders}
        selectedProviderId={selectedProviderId}
        setSelectedProvider={setSelectedProvider}
      />

      <ProjectTransferSection
        projectImportError={state.ui.projectImportError}
        exportCurrentProject={exportCurrentProject}
        importProjectFromFile={importProjectFromFile}
      />

      <PackageLifecycleSection
        packageStatus={currentPackageContent.packageStatus}
        transitionReadiness={transitionReadiness}
        moveToNextPackageState={moveToNextPackageState}
      />

      <DecompositionSection
        currentHierarchyModule={currentHierarchyModule}
        decompositionDraftNamesText={decompositionDraftNamesText}
        decompositionDraftChildKind={decompositionDraftChildKind}
        setDecompositionNamesText={setDecompositionNamesText}
        setDecompositionChildKind={setDecompositionChildKind}
        decomposeSelectedModule={decomposeSelectedModule}
      />

      <ValidationSummarySection
        designHasValidationIssues={designHasValidationIssues}
        moduleValidationIssues={moduleValidationIssues}
      />

      <PackageEditorSection
        currentPackageContent={currentPackageContent}
        currentSectionStatuses={currentSectionStatuses}
        moduleConnections={moduleConnections}
        updateCurrentPackage={updateCurrentPackage}
      />

      {isReviewOrHandoffMode ? (
        <>
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
        </>
      ) : null}

      {isHandoffMode ? (
        <>
          <HandoffSection
            state={state}
            approvedLeafReadyModules={approvedLeafReadyModules}
            latestHandoffArtifact={latestHandoffArtifact}
            isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
            hasCurrentSelectedArtifact={hasCurrentSelectedArtifact}
            selectModule={selectModule}
            markSelectedModuleAsHandedOff={markSelectedModuleAsHandedOff}
            exportLatestHandoffArtifact={exportLatestHandoffArtifact}
          />
          <ArtifactHistorySection handoffArtifacts={handoffArtifacts} />
        </>
      ) : null}
    </section>
  );
}
