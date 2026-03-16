import { describe, expect, it } from 'vitest';
import { deriveGenerationPayloadMinimalV1, type ModulePackage } from '../../../shared/src';

describe('deriveGenerationPayloadMinimalV1', () => {
  it('maps module package fields into generation payload shape', () => {
    const modulePackage: ModulePackage = {
      packageId: 'pkg_1',
      moduleId: 'mod_1',
      packageVersion: 'v1',
      packageStatus: 'leaf_ready',
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      lastUpdatedBy: 'tester',
      identity: {
        name: '  alu_top  '
      },
      interfaces: {
        ports: [{ id: 'p_clk', name: 'clk', direction: 'input', width: '1', description: 'clock' }]
      },
      purpose: {
        summary: '  Arithmetic top-level module '
      },
      constraints: {
        basicConstraints: ['single-cycle add']
      },
      dependencies: {
        relevantDependencies: ['upstream:controller:start']
      },
      behavior: {
        behaviorRules: ['valid implies ready'],
        clockResetNotes: ' synchronous reset '
      }
    };

    const payload = deriveGenerationPayloadMinimalV1(modulePackage);

    expect(payload).toEqual({
      module_name: 'alu_top',
      ports: [{ name: 'clk', direction: 'input', width: '1', description: 'clock' }],
      purpose: 'Arithmetic top-level module',
      basic_constraints: ['single-cycle add'],
      relevant_dependencies: ['upstream:controller:start'],
      behavior_rules: ['valid implies ready'],
      clock_reset_notes: 'synchronous reset'
    });
  });
});
