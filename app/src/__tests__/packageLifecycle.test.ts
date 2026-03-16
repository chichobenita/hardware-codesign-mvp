import { describe, expect, it } from 'vitest';
import type { ModulePackage } from '../../../shared/src';
import { getTransitionReadiness } from '../packageLifecycle';

function basePackage(status: ModulePackage['packageStatus']): ModulePackage {
  return {
    packageId: 'pkg_1',
    moduleId: 'mod_1',
    packageVersion: 'v1',
    packageStatus: status,
    lastUpdatedAt: '2026-01-01T00:00:00.000Z',
    lastUpdatedBy: 'tester'
  };
}

describe('getTransitionReadiness', () => {
  it('blocks transition to under_review when required sections are missing', () => {
    const readiness = getTransitionReadiness({
      ...basePackage('partially_defined'),
      identity: { name: 'decoder' },
      purpose: { summary: 'decode command words' }
    });

    expect(readiness?.from).toBe('partially_defined');
    expect(readiness?.to).toBe('under_review');
    expect(readiness?.canTransition).toBe(false);
    expect(readiness?.missingRequirements).toContain('At least one interface port is required.');
    expect(readiness?.missingRequirements).toContain('Behavior summary is required.');
    expect(readiness?.missingRequirements).toContain('At least one basic constraint is required.');
  });

  it('allows transition to under_review when requirements are satisfied', () => {
    const readiness = getTransitionReadiness({
      ...basePackage('partially_defined'),
      identity: { name: 'decoder' },
      purpose: { summary: 'decode command words' },
      interfaces: {
        ports: [{ id: 'p_in', name: 'in_data', direction: 'input', width: '32' }]
      },
      behavior: { behaviorSummary: 'Decodes input words by opcode.' },
      constraints: { basicConstraints: ['Must decode within 1 cycle.'] }
    });

    expect(readiness).toEqual({
      from: 'partially_defined',
      to: 'under_review',
      title: 'partially_defined → under_review',
      canTransition: true,
      missingRequirements: []
    });
  });
});
