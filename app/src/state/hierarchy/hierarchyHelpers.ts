import { getAuthoritativeModuleName, type ModulePackage } from '../../../../shared/src';
import type { ModuleNode } from '../../../../shared/src';
import type { DesignState } from '../../types';

type HierarchySnapshot = {
  moduleById: Record<string, ModuleNode>;
  packageById: Record<string, ModulePackage>;
  childIdsByParentId: Record<string, string[]>;
};

function unique(items: string[]): string[] {
  return [...new Set(items.filter((item) => item.trim().length > 0))];
}

function buildHierarchySnapshot(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>
): HierarchySnapshot {
  const moduleById = Object.fromEntries(moduleList.map((moduleNode) => [moduleNode.id, moduleNode])) as Record<string, ModuleNode>;
  const packageById = Object.fromEntries(
    moduleList
      .filter((moduleNode) => packageContentByModuleId[moduleNode.id])
      .map((moduleNode) => [moduleNode.id, packageContentByModuleId[moduleNode.id]!])
  ) as Record<string, ModulePackage>;

  const childIdsByParentId: Record<string, string[]> = Object.fromEntries(moduleList.map((moduleNode) => [moduleNode.id, []]));

  moduleList.forEach((moduleNode) => {
    const modulePackage = packageById[moduleNode.id];
    const declaredChildren = unique(modulePackage?.hierarchy?.childModuleIds ?? []).filter((childId) => moduleById[childId]);
    declaredChildren.forEach((childId) => {
      childIdsByParentId[moduleNode.id] = unique([...(childIdsByParentId[moduleNode.id] ?? []), childId]);
    });
  });

  moduleList.forEach((moduleNode) => {
    const parentId = packageById[moduleNode.id]?.hierarchy?.parentModuleId?.trim();
    if (!parentId || !moduleById[parentId]) {
      return;
    }
    childIdsByParentId[parentId] = unique([...(childIdsByParentId[parentId] ?? []), moduleNode.id]);
  });

  return { moduleById, packageById, childIdsByParentId };
}

function getModuleDisplayName(moduleNode: ModuleNode, modulePackage?: ModulePackage): string {
  return getAuthoritativeModuleName(moduleNode.id, modulePackage, moduleNode.name);
}

function resolveParentModuleId(
  moduleId: string,
  snapshot: HierarchySnapshot,
  visiting: Set<string>
): string {
  const parentId = snapshot.packageById[moduleId]?.hierarchy?.parentModuleId?.trim();
  if (!parentId || !snapshot.moduleById[parentId] || parentId === moduleId || visiting.has(parentId)) {
    return '';
  }

  const parentChildIds = snapshot.childIdsByParentId[parentId] ?? [];
  return parentChildIds.includes(moduleId) ? parentId : '';
}

function buildHierarchyPath(
  moduleId: string,
  snapshot: HierarchySnapshot,
  visiting: Set<string> = new Set()
): string[] {
  if (visiting.has(moduleId) || !snapshot.moduleById[moduleId]) {
    return [];
  }

  visiting.add(moduleId);
  const moduleNode = snapshot.moduleById[moduleId]!;
  const modulePackage = snapshot.packageById[moduleId];
  const parentId = resolveParentModuleId(moduleId, snapshot, visiting);
  const moduleName = getModuleDisplayName(moduleNode, modulePackage);
  const path = parentId
    ? [...buildHierarchyPath(parentId, snapshot, visiting), moduleName]
    : [moduleName];
  visiting.delete(moduleId);
  return unique(path);
}

function toCompositeStatus(modulePackage: ModulePackage): NonNullable<ModulePackage['decompositionStatus']> {
  return {
    decompositionStatus: 'composite',
    decompositionRationale: modulePackage.decompositionStatus?.decompositionRationale || 'Contains child modules.',
    stopReason: modulePackage.decompositionStatus?.stopReason,
    stopRecommendedBy: modulePackage.decompositionStatus?.stopRecommendedBy,
    furtherDecompositionNotes: modulePackage.decompositionStatus?.furtherDecompositionNotes
  };
}

export function normalizeHierarchyForPackages(
  moduleList: ModuleNode[],
  packageContentByModuleId: Record<string, ModulePackage>
): Record<string, ModulePackage> {
  const snapshot = buildHierarchySnapshot(moduleList, packageContentByModuleId);

  return Object.fromEntries(
    moduleList.map((moduleNode) => {
      const currentPackage = snapshot.packageById[moduleNode.id] ?? packageContentByModuleId[moduleNode.id];
      if (!currentPackage) {
        return [moduleNode.id, currentPackage];
      }

      const parentModuleId = resolveParentModuleId(moduleNode.id, snapshot, new Set());
      const childModuleIds = snapshot.childIdsByParentId[moduleNode.id] ?? [];
      const hierarchyPath = buildHierarchyPath(moduleNode.id, snapshot);

      return [
        moduleNode.id,
        {
          ...currentPackage,
          hierarchy: {
            parentModuleId,
            childModuleIds,
            hierarchyPath
          },
          decompositionStatus: childModuleIds.length > 0 ? toCompositeStatus(currentPackage) : currentPackage.decompositionStatus
        }
      ];
    })
  ) as Record<string, ModulePackage>;
}

export function selectHierarchyModuleId(state: DesignState, requestedModuleId: string): string {
  const normalizedPackages = normalizeHierarchyForPackages(state.moduleList, state.packageContentByModuleId);
  const moduleIds = new Set(state.moduleList.map((moduleNode) => moduleNode.id));
  const fallbackCompositeId = state.moduleList.find((moduleNode) => (normalizedPackages[moduleNode.id]?.hierarchy?.childModuleIds?.length ?? 0) > 0)?.id;
  const fallbackId = fallbackCompositeId ?? state.moduleList[0]?.id ?? '';

  if (!moduleIds.has(requestedModuleId)) {
    return fallbackId;
  }

  const requestedChildren = normalizedPackages[requestedModuleId]?.hierarchy?.childModuleIds ?? [];
  const requestedModule = state.moduleList.find((moduleNode) => moduleNode.id === requestedModuleId);
  if (requestedChildren.length > 0 || requestedModule?.kind === 'composite') {
    return requestedModuleId;
  }

  const parentId = normalizedPackages[requestedModuleId]?.hierarchy?.parentModuleId?.trim();
  return parentId && moduleIds.has(parentId) ? parentId : requestedModuleId;
}

export function selectVisibleHierarchyModuleIds(state: DesignState, hierarchyModuleId: string): Set<string> {
  const normalizedPackages = normalizeHierarchyForPackages(state.moduleList, state.packageContentByModuleId);
  const currentHierarchyId = selectHierarchyModuleId(state, hierarchyModuleId);
  const childIds = normalizedPackages[currentHierarchyId]?.hierarchy?.childModuleIds ?? [];
  return new Set([currentHierarchyId, ...childIds]);
}

export function selectHierarchyAncestorIds(state: DesignState, moduleId: string): string[] {
  const normalizedPackages = normalizeHierarchyForPackages(state.moduleList, state.packageContentByModuleId);
  const ancestors: string[] = [];
  let cursorId = moduleId;
  const visited = new Set<string>();

  while (cursorId && !visited.has(cursorId) && normalizedPackages[cursorId]) {
    visited.add(cursorId);
    ancestors.unshift(cursorId);
    cursorId = normalizedPackages[cursorId]?.hierarchy?.parentModuleId?.trim() ?? '';
  }

  return ancestors;
}
