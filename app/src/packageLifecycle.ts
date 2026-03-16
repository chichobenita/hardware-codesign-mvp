import type { ModulePackage, PackageStatus } from '../../shared/src';

export type TransitionReadiness = {
  from: PackageStatus;
  to: PackageStatus;
  title: string;
  canTransition: boolean;
  missingRequirements: string[];
};

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function hasPorts(modulePackage: ModulePackage): boolean {
  return (modulePackage.interfaces?.ports ?? []).length > 0;
}

function isApprovedLeaf(modulePackage: ModulePackage): boolean {
  return modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
}

function checkDraftToPartiallyDefined(modulePackage: ModulePackage): string[] {
  const missing: string[] = [];

  if (!hasText(modulePackage.identity?.name)) {
    missing.push('Identity name is required.');
  }
  if (!hasText(modulePackage.purpose?.summary)) {
    missing.push('Purpose summary is required.');
  }

  return missing;
}

function checkPartiallyDefinedToUnderReview(modulePackage: ModulePackage): string[] {
  const missing: string[] = [];

  if (!hasPorts(modulePackage)) {
    missing.push('At least one interface port is required.');
  }
  if (!hasText(modulePackage.behavior?.behaviorSummary)) {
    missing.push('Behavior summary is required.');
  }
  if (!hasText(modulePackage.constraints?.basicConstraints?.[0])) {
    missing.push('At least one basic constraint is required.');
  }

  return missing;
}

function checkUnderReviewToApproved(modulePackage: ModulePackage): string[] {
  const missing: string[] = [];

  if (!hasText(modulePackage.identity?.description)) {
    missing.push('Identity description is required for approval.');
  }
  if (!hasText(modulePackage.behavior?.clockResetNotes)) {
    missing.push('Clock/reset notes are required for approval.');
  }

  return missing;
}

function checkApprovedToLeafReady(modulePackage: ModulePackage): string[] {
  const missing: string[] = [];

  if (!isApprovedLeaf(modulePackage)) {
    missing.push('Decomposition status must be approved_leaf.');
  }

  return missing;
}

const orderedStates: PackageStatus[] = ['draft', 'partially_defined', 'under_review', 'approved', 'leaf_ready', 'handed_off'];

export function getNextPackageState(packageStatus: PackageStatus): PackageStatus | null {
  const index = orderedStates.indexOf(packageStatus);
  if (index < 0 || index === orderedStates.length - 1) {
    return null;
  }

  return orderedStates[index + 1];
}

export function getTransitionReadiness(modulePackage: ModulePackage): TransitionReadiness | null {
  const from = modulePackage.packageStatus;
  const to = getNextPackageState(from);

  if (!to) {
    return null;
  }

  let missingRequirements: string[] = [];

  if (from === 'draft' && to === 'partially_defined') {
    missingRequirements = checkDraftToPartiallyDefined(modulePackage);
  } else if (from === 'partially_defined' && to === 'under_review') {
    missingRequirements = checkPartiallyDefinedToUnderReview(modulePackage);
  } else if (from === 'under_review' && to === 'approved') {
    missingRequirements = checkUnderReviewToApproved(modulePackage);
  } else if (from === 'approved' && to === 'leaf_ready') {
    missingRequirements = checkApprovedToLeafReady(modulePackage);
  }

  return {
    from,
    to,
    title: `${from} → ${to}`,
    canTransition: missingRequirements.length === 0,
    missingRequirements
  };
}

export function getTransitionActionLabel(nextState: PackageStatus): string {
  if (nextState === 'approved') {
    return 'Approve package';
  }
  if (nextState === 'leaf_ready') {
    return 'Mark as leaf-ready';
  }
  if (nextState === 'handed_off') {
    return 'Hand off package';
  }

  return `Move to ${nextState}`;
}
