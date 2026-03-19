import { describe, expect, it } from 'vitest';
import type { SemanticValidationIssue } from '../../../shared/src';
import { evaluateModuleWorkflowPolicy, summarizeWorkflowIssues } from '../application/policies/workflowReadinessPolicy';
import { seedState } from '../state/designReducer';

describe('workflowReadinessPolicy', () => {
  it('treats validation errors as blocking for review and handoff', () => {
    const moduleNode = seedState.moduleList.find((item) => item.id === 'example_uart_rx');
    const modulePackage = {
      ...seedState.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready' as const
    };

    const policy = evaluateModuleWorkflowPolicy(moduleNode, modulePackage, 'handoff', [{
      code: 'leaf_missing_ports',
      severity: 'error',
      moduleId: 'example_uart_rx',
      message: 'Ports are required.'
    }]);

    expect(policy.structural.isStructurallyReadyForReviewOrHandoff).toBe(true);
    expect(policy.validation.hasBlockingIssues).toBe(true);
    expect(policy.review.isEligible).toBe(false);
    expect(policy.handoff.isEligible).toBe(false);
    expect(policy.handoff.readinessLabel).toBe('blocked');
  });

  it('keeps warning-only modules eligible while surfacing ready_with_warnings', () => {
    const moduleNode = seedState.moduleList.find((item) => item.id === 'example_uart_rx');
    const modulePackage = {
      ...seedState.packageContentByModuleId.example_uart_rx,
      packageStatus: 'leaf_ready' as const
    };

    const issues: SemanticValidationIssue[] = [{
      code: 'missing_dependency_for_connection',
      severity: 'warning' as const,
      moduleId: 'example_uart_rx',
      message: 'Dependency entry is missing.'
    }];
    const policy = evaluateModuleWorkflowPolicy(moduleNode, modulePackage, 'review', issues);

    expect(summarizeWorkflowIssues(issues).hasWarnings).toBe(true);
    expect(policy.review.isEligible).toBe(true);
    expect(policy.handoff.isEligible).toBe(true);
    expect(policy.payloadPreview.canShow).toBe(true);
    expect(policy.handoff.readinessLabel).toBe('ready_with_warnings');
  });
});
