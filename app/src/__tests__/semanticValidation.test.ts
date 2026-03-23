import { describe, expect, it } from 'vitest';
import type { ModulePackage } from '../../../shared/src';
import { validateSemanticDesign } from '../../../shared/src';

function createPackage(moduleId: string, overrides: Partial<ModulePackage> = {}): ModulePackage {
  return {
    packageId: `pkg_${moduleId}`,
    moduleId,
    packageVersion: '0.1.0',
    packageStatus: 'draft',
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    lastUpdatedBy: 'test',
    identity: { name: moduleId },
    interfaces: { ports: [], interfaceNotes: '' },
    purpose: { summary: '' },
    dependencies: { relevantDependencies: [], integrationAssumptions: [], links: [] },
    behavior: { behaviorRules: [], clockResetNotes: '', cornerCases: [], implementationNotes: [] },
    decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: 'test' },
    ...overrides
  };
}

describe('validateSemanticDesign', () => {
  it('flags duplicate port names inside one module', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['m1'],
      connections: [],
      packageContentByModuleId: {
        m1: createPackage('m1', {
          interfaces: {
            ports: [
              { id: 'p1', name: 'data', direction: 'input' },
              { id: 'p2', name: 'data', direction: 'output' }
            ]
          }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'duplicate_port_name' && issue.moduleId === 'm1')).toBe(true);
  });

  it('flags self-connections', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['m1'],
      connections: [{ fromModuleId: 'm1', toModuleId: 'm1', signal: 'loop' }],
      packageContentByModuleId: { m1: createPackage('m1') }
    });

    expect(issues.some((issue) => issue.code === 'self_connection' && issue.moduleId === 'm1')).toBe(true);
  });

  it('flags connection references to missing modules', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['m1'],
      connections: [{ fromModuleId: 'm1', toModuleId: 'm2', signal: 'x' }],
      packageContentByModuleId: { m1: createPackage('m1') }
    });

    expect(issues.some((issue) => issue.code === 'connection_missing_module')).toBe(true);
  });

  it('flags approved leaf modules missing purpose', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['leaf1'],
      connections: [],
      packageContentByModuleId: {
        leaf1: createPackage('leaf1', {
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'done' },
          purpose: { summary: '' }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'leaf_missing_purpose' && issue.moduleId === 'leaf1')).toBe(true);
  });

  it('flags leaf_ready modules with no ports', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['leaf1'],
      connections: [],
      packageContentByModuleId: {
        leaf1: createPackage('leaf1', {
          packageStatus: 'leaf_ready',
          purpose: { summary: 'valid purpose' },
          interfaces: { ports: [] }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'leaf_missing_ports' && issue.moduleId === 'leaf1')).toBe(true);
  });

  it('flags leaf-ready modules missing clock/reset notes as blocking', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['leaf1'],
      connections: [],
      packageContentByModuleId: {
        leaf1: createPackage('leaf1', {
          packageStatus: 'leaf_ready',
          purpose: { summary: 'valid purpose' },
          interfaces: {
            ports: [{ id: 'clk', name: 'clk', direction: 'input', description: 'system clock' }]
          },
          behavior: {
            behaviorRules: ['sample on rising edge'],
            clockResetNotes: ''
          },
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'done' }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'leaf_missing_clock_reset_notes' && issue.severity === 'error')).toBe(true);
  });

  it('warns when a leaf interface lacks descriptive context', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['leaf1'],
      connections: [],
      packageContentByModuleId: {
        leaf1: createPackage('leaf1', {
          packageStatus: 'leaf_ready',
          purpose: { summary: 'valid purpose' },
          interfaces: {
            ports: [
              { id: 'in_a', name: 'in_a', direction: 'input' },
              { id: 'out_b', name: 'out_b', direction: 'output' }
            ],
            interfaceNotes: ''
          },
          behavior: {
            behaviorRules: ['forward input to output'],
            clockResetNotes: 'No reset behavior required.'
          },
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'done' }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'leaf_interface_clarity_incomplete' && issue.severity === 'warning')).toBe(true);
  });

  it('warns when a connected leaf lacks integration assumptions and corner cases', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['src', 'dst'],
      connections: [{ fromModuleId: 'src', toModuleId: 'dst', signal: 'data' }],
      packageContentByModuleId: {
        src: createPackage('src', {
          packageStatus: 'leaf_ready',
          purpose: { summary: 'produce data' },
          interfaces: {
            ports: [
              { id: 'clk', name: 'clk', direction: 'input', description: 'system clock' },
              { id: 'valid_o', name: 'valid_o', direction: 'output' },
              { id: 'data_o', name: 'data_o', direction: 'output' }
            ],
            interfaceNotes: 'Outputs sampled by downstream logic.'
          },
          behavior: {
            behaviorRules: ['present data_o with valid_o'],
            clockResetNotes: 'Reset clears output-valid state.',
            cornerCases: []
          },
          dependencies: {
            relevantDependencies: ['downstream:dst:data'],
            integrationAssumptions: [],
            links: [{ direction: 'downstream', moduleId: 'dst', signal: 'data' }]
          },
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'done' }
        }),
        dst: createPackage('dst', {
          packageStatus: 'leaf_ready',
          purpose: { summary: 'consume data' },
          interfaces: {
            ports: [
              { id: 'clk', name: 'clk', direction: 'input', description: 'system clock' },
              { id: 'valid_i', name: 'valid_i', direction: 'input', description: 'input valid' },
              { id: 'data_i', name: 'data_i', direction: 'input', description: 'input data' }
            ],
            interfaceNotes: 'Consumes data from upstream source.'
          },
          behavior: {
            behaviorRules: ['consume data only when valid_i is asserted'],
            clockResetNotes: 'Reset clears internal consume state.',
            cornerCases: ['Ignore invalid transfers during reset release']
          },
          dependencies: {
            relevantDependencies: ['upstream:src:data'],
            integrationAssumptions: ['Upstream source holds data stable during valid'],
            links: [{ direction: 'upstream', moduleId: 'src', signal: 'data' }]
          },
          decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'done' }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'leaf_missing_integration_assumptions' && issue.moduleId === 'src')).toBe(true);
    expect(issues.some((issue) => issue.code === 'leaf_missing_corner_cases' && issue.moduleId === 'src')).toBe(true);
  });

  it('validates dependency links against active connections', () => {
    const issues = validateSemanticDesign({
      moduleIds: ['src', 'dst'],
      connections: [{ fromModuleId: 'src', toModuleId: 'dst', signal: 'data' }],
      packageContentByModuleId: {
        src: createPackage('src', {
          dependencies: {
            relevantDependencies: ['downstream:dst:data'],
            links: [{ direction: 'downstream', moduleId: 'dst', signal: 'data' }]
          }
        }),
        dst: createPackage('dst', {
          dependencies: {
            relevantDependencies: ['upstream:src:data', 'upstream:legacy_mod:old_sig'],
            links: [{ direction: 'upstream', moduleId: 'legacy_mod', signal: 'old_sig' }]
          }
        })
      }
    });

    expect(issues.some((issue) => issue.code === 'missing_dependency_for_connection' && issue.moduleId === 'dst')).toBe(true);
    expect(issues.some((issue) => issue.code === 'stale_dependency_entry' && issue.moduleId === 'dst')).toBe(true);
  });
});
