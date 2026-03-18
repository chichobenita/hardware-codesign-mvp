import type { HandoffArtifact } from '../handoffTypes';

export type ProviderHandoffResult = {
  providerId: string;
  status: 'handed_off';
  summary: string;
};

export type ProviderExecutionFailure = {
  providerId: string;
  summary: string;
  errorMessage: string;
  retryable: boolean;
};

export type ProviderExecutionResult =
  | { ok: true; response: ProviderHandoffResult }
  | { ok: false; error: ProviderExecutionFailure };

export type HandoffProvider = {
  id: string;
  label: string;
  description: string;
  buildResultSnapshot: (artifact: HandoffArtifact) => ProviderHandoffResult;
  executeHandoffArtifact: (artifact: HandoffArtifact) => Promise<ProviderExecutionResult>;
};
