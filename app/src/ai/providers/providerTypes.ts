import type { GenerationPayloadMinimal } from '../../../../shared/src';

<<<<<<< HEAD
export type ProviderMetadata = {
  id: string;
  label: string;
  description: string;
};

export type ProviderInvocationRequest = {
  artifactId: string;
  providerId: string;
  moduleId: string;
  moduleName: string;
  createdAt: string;
  generationPayload: GenerationPayloadMinimal;
  prompt: {
    title: string;
    text: string;
  };
};

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

export type HandoffProvider = ProviderMetadata & {
  buildPreparedResult: (request: ProviderInvocationRequest) => ProviderHandoffResult;
  executePreparedRequest: (request: ProviderInvocationRequest) => Promise<ProviderExecutionResult>;
=======
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
>>>>>>> origin/main
};
