import type { ModulePackage } from '../../../../shared/src';
import type { DesignState, HierarchyBreadcrumbItem, ModuleNode } from '../../types';
import {
  normalizeHierarchyForPackages,
  selectHierarchyAncestorIds,
  selectHierarchyModuleId,
  selectVisibleHierarchyModuleIds
} from './hierarchyHelpers';

export function selectNormalizedHierarchyPackages(state: DesignState): Record<string, ModulePackage> {
  return normalizeHierarchyForPackages(state.moduleList, state.packageContentByModuleId);
}

export function selectCurrentHierarchyModuleFromState(state: DesignState): ModuleNode | undefined {
  const hierarchyModuleId = selectHierarchyModuleId(state, state.ui.currentHierarchyModuleId);
  return state.moduleList.find((moduleNode) => moduleNode.id === hierarchyModuleId) ?? state.moduleList[0];
}

export function selectCurrentHierarchyPackageFromState(state: DesignState): ModulePackage | undefined {
  const currentHierarchyModule = selectCurrentHierarchyModuleFromState(state);
  if (!currentHierarchyModule) {
    return undefined;
  }

  return selectNormalizedHierarchyPackages(state)[currentHierarchyModule.id];
}

export function selectHierarchyBreadcrumbsFromState(state: DesignState): HierarchyBreadcrumbItem[] {
  const currentHierarchyModule = selectCurrentHierarchyModuleFromState(state);
  if (!currentHierarchyModule) {
    return [];
  }

  const normalizedPackages = selectNormalizedHierarchyPackages(state);
  return selectHierarchyAncestorIds(state, currentHierarchyModule.id).map((moduleId) => ({
    moduleId,
    label: normalizedPackages[moduleId]?.identity?.name ?? state.moduleList.find((moduleNode) => moduleNode.id === moduleId)?.name ?? moduleId
  }));
}

export function selectVisibleModulesFromState(state: DesignState): ModuleNode[] {
  const currentHierarchyModule = selectCurrentHierarchyModuleFromState(state);
  if (!currentHierarchyModule) {
    return state.moduleList;
  }

  const visibleIds = selectVisibleHierarchyModuleIds(state, currentHierarchyModule.id);
  return state.moduleList.filter((moduleNode) => visibleIds.has(moduleNode.id));
}
