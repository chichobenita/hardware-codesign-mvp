import { describe, expect, it } from 'vitest';
import { seedState } from '../state/designReducer';
import type { DesignState } from '../types';
import {
  selectDesignHasValidationIssues,
  selectHierarchyBreadcrumbs,
  selectModuleHasBlockingValidationErrors,
  selectModuleIsValidForReviewOrHandoff,
  selectValidationIssuesForModule,
  selectVisibleModules
} from '../state/designSelectors';

describe('designSelectors semantic validation integration', () => {
  it('returns module-level validation issues', () => {
    const state = {
      ...seedState,
      packageContentByModuleId: {
        ...seedState.packageContentByModuleId,
        child_a: {
          ...seedState.packageContentByModuleId.child_a,
          interfaces: {
            ports: [
              { id: 'a', name: 'dup', direction: 'input' as const },
              { id: 'b', name: 'dup', direction: 'output' as const }
            ]
          }
        }
      }
    };

    const issues = selectValidationIssuesForModule(state, 'child_a');
    expect(issues.some((issue) => issue.code === 'duplicate_port_name')).toBe(true);
    expect(selectModuleHasBlockingValidationErrors(state, 'child_a')).toBe(true);
    expect(selectModuleIsValidForReviewOrHandoff(state, 'child_a')).toBe(false);
    expect(selectDesignHasValidationIssues(state)).toBe(true);
  });



  it('keeps breadcrumb and scope semantics stable after hierarchy changes', () => {
    const nestedState: DesignState = {
      ...seedState,
      moduleList: [...seedState.moduleList, { id: 'nested', name: 'nested_decoder', kind: 'leaf' as const }],
      packageContentByModuleId: {
        ...seedState.packageContentByModuleId,
        root: {
          ...seedState.packageContentByModuleId.root,
          identity: { ...seedState.packageContentByModuleId.root.identity, name: 'system_top' },
          hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b', 'example_uart_rx'], hierarchyPath: ['system_top'] }
        },
        child_a: {
          ...seedState.packageContentByModuleId.child_a,
          hierarchy: {
            parentModuleId: 'root',
            childModuleIds: ['nested'],
            hierarchyPath: ['system_top', 'input_fifo']
          },
          decompositionStatus: {
            decompositionStatus: 'composite' as const,
            decompositionRationale: 'contains nested'
          }
        },
        nested: {
          packageId: 'pkg_nested',
          moduleId: 'nested',
          packageVersion: '0.1.0',
          packageStatus: 'draft' as const,
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'nested_decoder' },
          hierarchy: { parentModuleId: 'child_a', childModuleIds: [], hierarchyPath: ['system_top', 'input_fifo', 'nested_decoder'] },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      ui: {
        ...seedState.ui,
        currentHierarchyModuleId: 'nested',
        selectedModuleId: 'nested'
      }
    } as DesignState;

    expect(selectVisibleModules(nestedState).map((moduleNode) => moduleNode.id)).toEqual(['child_a', 'nested']);
    expect(selectHierarchyBreadcrumbs(nestedState)).toEqual([
      { moduleId: 'root', label: 'system_top' },
      { moduleId: 'child_a', label: 'input_fifo' }
    ]);
  });

  it('scopes visible modules to the current hierarchy module and its direct children', () => {
    const visibleIds = selectVisibleModules(seedState).map((moduleNode) => moduleNode.id);
    expect(visibleIds).toEqual(expect.arrayContaining(['root', 'child_a', 'child_b', 'example_uart_rx']));

    const nestedState: DesignState = {
      ...seedState,
      moduleList: [...seedState.moduleList, { id: 'nested', name: 'nested', kind: 'leaf' as const }],
      packageContentByModuleId: {
        ...seedState.packageContentByModuleId,
        child_a: {
          ...seedState.packageContentByModuleId.child_a,
          hierarchy: {
            parentModuleId: 'root',
            childModuleIds: ['nested'],
            hierarchyPath: ['top_controller', 'input_fifo']
          },
          decompositionStatus: {
            decompositionStatus: 'composite' as const,
            decompositionRationale: 'contains nested'
          }
        },
        nested: {
          packageId: 'pkg_nested',
          moduleId: 'nested',
          packageVersion: '0.1.0',
          packageStatus: 'draft' as const,
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'nested' },
          hierarchy: { parentModuleId: 'child_a', childModuleIds: [], hierarchyPath: ['top_controller', 'input_fifo', 'nested'] },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      ui: {
        ...seedState.ui,
        currentHierarchyModuleId: 'child_a'
      }
    };

    expect(selectVisibleModules(nestedState).map((moduleNode) => moduleNode.id)).toEqual(['child_a', 'nested']);
  });
});
