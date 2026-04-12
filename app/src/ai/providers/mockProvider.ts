import type {
  HandoffProvider,
  ProviderExecutionFailure,
  ProviderExecutionResult,
  ProviderHandoffResult,
  ProviderInvocationRequest
} from './providerTypes';

export const MOCK_PROVIDER_ID = 'mock-local-hdl';
export const MOCK_STRUCTURED_PROVIDER_ID = 'mock-structured-hdl';

const EXECUTION_DELAY_MS = 30;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function buildLocalSuccessResult(request: ProviderInvocationRequest): ProviderHandoffResult {
  return {
    providerId: MOCK_PROVIDER_ID,
    status: 'handed_off',
    summary: `Mock provider accepted ${request.moduleName} locally.`
  };
}

function buildStructuredSuccessResult(request: ProviderInvocationRequest): ProviderHandoffResult {
  return {
    providerId: MOCK_STRUCTURED_PROVIDER_ID,
    status: 'handed_off',
    summary: `Structured mock provider accepted ${request.moduleName} locally.`
  };
}

function buildStructuredFailureResult(request: ProviderInvocationRequest): ProviderExecutionFailure {
  return {
    providerId: MOCK_STRUCTURED_PROVIDER_ID,
    summary: `Structured mock provider rejected ${request.moduleName} locally.`,
    errorMessage: `Structured mock provider could not process ${request.moduleName}.`,
    retryable: true
  };
}

function shouldFailStructuredExecution(request: ProviderInvocationRequest): boolean {
  const fingerprint = `${request.moduleId} ${request.moduleName}`.toLowerCase();
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
  buildPreparedResult: buildLocalSuccessResult,
  executePreparedRequest: async (request) => executeWithDelay({ ok: true, response: buildLocalSuccessResult(request) })
};

export const mockStructuredHdlProvider: HandoffProvider = {
  id: MOCK_STRUCTURED_PROVIDER_ID,
  label: 'Mock Structured HDL',
  description: 'Alternate frontend-only mock provider for exercising provider selection in MVP review/handoff flow.',
  buildPreparedResult: buildStructuredSuccessResult,
  executePreparedRequest: async (request) => {
    if (shouldFailStructuredExecution(request)) {
      return executeWithDelay({ ok: false, error: buildStructuredFailureResult(request) });
    }

    return executeWithDelay({ ok: true, response: buildStructuredSuccessResult(request) });
  }
};
