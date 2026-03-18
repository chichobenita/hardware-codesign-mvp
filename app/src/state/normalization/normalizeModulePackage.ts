import { getAuthoritativeModuleName, type ModuleDependencyLink, type ModulePackage, type PackageStatus } from '../../../../shared/src';
import type { ModuleNode } from '../../../../shared/src';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isModuleDependencyLink(value: unknown): value is ModuleDependencyLink {
  return (
    typeof value === 'object'
    && value !== null
    && ('direction' in value)
    && (((value as { direction?: unknown }).direction === 'upstream') || ((value as { direction?: unknown }).direction === 'downstream'))
    && ('moduleId' in value)
    && typeof (value as { moduleId?: unknown }).moduleId === 'string'
    && (!('signal' in value) || typeof (value as { signal?: unknown }).signal === 'string' || (value as { signal?: unknown }).signal === undefined)
  );
}

function normalizePackageStatus(value: unknown): PackageStatus {
  return value === 'draft'
    || value === 'partially_defined'
    || value === 'under_review'
    || value === 'approved'
    || value === 'leaf_ready'
    || value === 'handed_off'
    ? value
    : 'draft';
}

export function normalizeModulePackage(moduleNode: ModuleNode, existingPackage?: ModulePackage, fallbackUpdatedBy = 'mock_user'): ModulePackage {
  const moduleName = getAuthoritativeModuleName(moduleNode.id, existingPackage, moduleNode.name);

  return {
    packageId: existingPackage?.packageId ?? `pkg_${moduleNode.id}`,
    moduleId: moduleNode.id,
    packageVersion: existingPackage?.packageVersion ?? '0.1.0',
    packageStatus: normalizePackageStatus(existingPackage?.packageStatus),
    lastUpdatedAt: existingPackage?.lastUpdatedAt ?? '',
    lastUpdatedBy: existingPackage?.lastUpdatedBy ?? fallbackUpdatedBy,
    identity: {
      ...existingPackage?.identity,
      name: moduleName
    },
    hierarchy: {
      parentModuleId: existingPackage?.hierarchy?.parentModuleId ?? '',
      childModuleIds: isStringArray(existingPackage?.hierarchy?.childModuleIds) ? [...new Set(existingPackage.hierarchy.childModuleIds.filter((item) => item.trim().length > 0))] : [],
      hierarchyPath: isStringArray(existingPackage?.hierarchy?.hierarchyPath)
        ? existingPackage.hierarchy.hierarchyPath.filter((item) => item.trim().length > 0)
        : [moduleName]
    },
    interfaces: {
      ports: Array.isArray(existingPackage?.interfaces?.ports) ? existingPackage.interfaces?.ports ?? [] : []
    },
    purpose: {
      summary: existingPackage?.purpose?.summary ?? ''
    },
    constraints: {
      basicConstraints: isStringArray(existingPackage?.constraints?.basicConstraints) ? existingPackage.constraints.basicConstraints : []
    },
    dependencies: {
      links: Array.isArray(existingPackage?.dependencies?.links)
        ? existingPackage.dependencies.links.filter(isModuleDependencyLink)
        : [],
      relevantDependencies: isStringArray(existingPackage?.dependencies?.relevantDependencies)
        ? existingPackage.dependencies.relevantDependencies
        : []
    },
    behavior: {
      behaviorSummary: existingPackage?.behavior?.behaviorSummary ?? '',
      operationalDescription: existingPackage?.behavior?.operationalDescription ?? '',
      behaviorRules: isStringArray(existingPackage?.behavior?.behaviorRules) ? existingPackage.behavior.behaviorRules : [],
      clockResetNotes: existingPackage?.behavior?.clockResetNotes ?? ''
    },
    decompositionStatus: existingPackage?.decompositionStatus
      ? {
          decompositionStatus: existingPackage.decompositionStatus.decompositionStatus,
          decompositionRationale: existingPackage.decompositionStatus.decompositionRationale ?? '',
          stopReason: existingPackage.decompositionStatus.stopReason,
          stopRecommendedBy: existingPackage.decompositionStatus.stopRecommendedBy,
          furtherDecompositionNotes: existingPackage.decompositionStatus.furtherDecompositionNotes
        }
      : { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
  };
}
