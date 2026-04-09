import { DecompositionSection } from '../modulePackagePanel/DecompositionSection';
import { PackageEditorSection } from '../modulePackagePanel/PackageEditorSection';
import { PackageLifecycleSection } from '../modulePackagePanel/PackageLifecycleSection';
import { WorkspaceFrame } from './WorkspaceFrame';
import type { SecondaryWorkspaceSharedProps } from './types';

export function PackageEditorWorkspace({
  currentPackageContent,
  transitionReadiness,
  moveToNextPackageState,
  currentSectionStatuses,
  updateCurrentPackage,
  moduleConnections,
  currentHierarchyModule,
  decompositionDraftNamesText,
  decompositionDraftChildKind,
  setDecompositionNamesText,
  setDecompositionChildKind,
  decomposeSelectedModule,
  isSelectedModuleValidForReviewOrHandoff,
  moduleValidationIssues
}: SecondaryWorkspaceSharedProps): JSX.Element {
  return (
    <WorkspaceFrame
      title="Package editor"
      description="Focused module package editing for the selected module. Lifecycle, decomposition, and structured field editing stay together here."
      statusChips={[
        `Package: ${currentPackageContent.packageStatus}`,
        isSelectedModuleValidForReviewOrHandoff ? 'Reviewable now' : 'Needs more package detail',
        moduleValidationIssues.length === 0 ? 'Validation clean' : `${moduleValidationIssues.length} issue${moduleValidationIssues.length === 1 ? '' : 's'}`
      ]}
    >
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

      <PackageEditorSection
        currentPackageContent={currentPackageContent}
        currentSectionStatuses={currentSectionStatuses}
        moduleConnections={moduleConnections}
        updateCurrentPackage={updateCurrentPackage}
      />
    </WorkspaceFrame>
  );
}
