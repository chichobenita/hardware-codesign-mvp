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
    interfaces: { ports: [] },
    purpose: { summary: '' },
    dependencies: { relevantDependencies: [], links: [] },
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
