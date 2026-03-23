import type { HandoffArtifact } from '../handoffTypes';
import type { HandoffProvider, ProviderExecutionFailure, ProviderExecutionResult, ProviderHandoffResult } from './providerTypes';

export const MOCK_PROVIDER_ID = 'mock-local-hdl';
export const MOCK_STRUCTURED_PROVIDER_ID = 'mock-structured-hdl';

const EXECUTION_DELAY_MS = 30;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function buildLocalSuccessResult(artifact: HandoffArtifact): ProviderHandoffResult {
  return {
    providerId: MOCK_PROVIDER_ID,
    status: 'handed_off',
    summary: `Mock provider accepted ${artifact.moduleName} locally.`
  };
}

function buildStructuredSuccessResult(artifact: HandoffArtifact): ProviderHandoffResult {
  return {
    providerId: MOCK_STRUCTURED_PROVIDER_ID,
    status: 'handed_off',
    summary: `Structured mock provider accepted ${artifact.moduleName} locally.`
  };
}

function buildStructuredFailureResult(artifact: HandoffArtifact): ProviderExecutionFailure {
  return {
    providerId: MOCK_STRUCTURED_PROVIDER_ID,
    summary: `Structured mock provider rejected ${artifact.moduleName} locally.`,
    errorMessage: `Structured mock provider could not process ${artifact.moduleName}.`,
    retryable: true
  };
}

function shouldFailStructuredExecution(artifact: HandoffArtifact): boolean {
  const fingerprint = `${artifact.moduleId} ${artifact.moduleName}`.toLowerCase();
  return fingerprint.includes('fail');
}

async function executeWithDelay(result: ProviderExecutionResult): Promise<ProviderExecutionResult> {
  await wait(EXECUTION_DELAY_MS);
  return result;
}

export const mockLocalHdlProvider: HandoffProvider = {
  id: MOCK_PROVIDER_ID,
  label: 'Mock Local HDL',
  description: 'Frontend-only deterministic handoff adapter for MVP artifact flow.',
  buildResultSnapshot: buildLocalSuccessResult,
  executeHandoffArtifact: async (artifact) => executeWithDelay({ ok: true, response: buildLocalSuccessResult(artifact) })
};

export const mockStructuredHdlProvider: HandoffProvider = {
  id: MOCK_STRUCTURED_PROVIDER_ID,
  label: 'Mock Structured HDL',
  description: 'Alternate frontend-only mock provider for exercising provider selection in MVP review/handoff flow.',
  buildResultSnapshot: buildStructuredSuccessResult,
  executeHandoffArtifact: async (artifact) => {
    if (shouldFailStructuredExecution(artifact)) {
      return executeWithDelay({ ok: false, error: buildStructuredFailureResult(artifact) });
    }

    return executeWithDelay({ ok: true, response: buildStructuredSuccessResult(artifact) });
  }
};
