import { describe, expect, it } from 'vitest';
import { seedState } from '../state/designReducer';
import {
  selectDesignHasValidationIssues,
  selectModuleHasBlockingValidationErrors,
  selectModuleIsValidForReviewOrHandoff,
  selectValidationIssuesForModule
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
});
