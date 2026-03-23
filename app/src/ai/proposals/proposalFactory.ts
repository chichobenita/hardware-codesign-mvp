import type { ModulePackage, ModulePort, ModuleNode } from '../../../../shared/src';
import type { AiProposal } from './proposalTypes';

function createDefaultPorts(moduleId: string): ModulePort[] {
  return [
    { id: `${moduleId}_clk`, name: 'clk', direction: 'input', width: '1', description: 'System clock' },
    { id: `${moduleId}_rst_n`, name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
    { id: `${moduleId}_valid_i`, name: 'valid_i', direction: 'input', width: '1', description: 'Input valid handshake' },
    { id: `${moduleId}_ready_o`, name: 'ready_o', direction: 'output', width: '1', description: 'Output ready handshake' }
  ];
}

export function createMockProposals(moduleNode: ModuleNode, modulePackage: ModulePackage): AiProposal[] {
  const moduleName = modulePackage.identity?.name ?? moduleNode.name;
  const hasChildren = (modulePackage.hierarchy?.childModuleIds?.length ?? 0) > 0;

  return [
    {
      proposalId: `${moduleNode.id}-purpose`,
      source: { kind: 'mock_local', label: 'Mock local planner' },
      target: { moduleId: moduleNode.id, scope: 'module_package' },
      status: 'proposed',
      rationale: 'Suggested purpose statement for the selected module package.',
      proposedChange: {
        kind: 'purpose_update',
        purposeSummary: `Coordinate ${moduleName} data flow and expose a stable contract to peer modules.`
      }
    },
    {
      proposalId: `${moduleNode.id}-behavior`,
      source: { kind: 'mock_local', label: 'Mock local planner' },
      target: { moduleId: moduleNode.id, scope: 'module_package' },
      status: 'proposed',
      rationale: 'Suggested behavior summary for the selected module package.',
      proposedChange: {
        kind: 'behavior_update',
        behaviorSummary: `On each valid cycle, ${moduleName} consumes inputs, applies internal control rules, and updates outputs deterministically.`
      }
    },
    {
      proposalId: `${moduleNode.id}-ports`,
      source: { kind: 'mock_local', label: 'Mock local planner' },
      target: { moduleId: moduleNode.id, scope: 'module_package' },
      status: 'proposed',
      rationale: 'Suggested interface ports for the selected module package.',
      proposedChange: {
        kind: 'ports_update',
        ports: createDefaultPorts(moduleNode.id)
      }
    },
    {
      proposalId: `${moduleNode.id}-decomposition`,
      source: { kind: 'mock_local', label: 'Mock local planner' },
      target: { moduleId: moduleNode.id, scope: 'module_package' },
      status: 'proposed',
      rationale: 'Suggested decomposition status for the selected module package.',
      proposedChange: {
        kind: 'decomposition_update',
        decompositionStatus: hasChildren ? 'composite' : 'candidate_leaf',
        decompositionRationale: hasChildren
          ? `${moduleName} already coordinates sub-modules and should remain composite.`
          : `${moduleName} looks self-contained enough to evaluate as a leaf candidate.`
      }
    }
  ];
}
