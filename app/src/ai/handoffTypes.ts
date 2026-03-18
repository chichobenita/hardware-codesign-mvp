import type { GenerationPayloadMinimal } from '../../../shared/src';

export const HANDOFF_ARTIFACT_SCHEMA_VERSION = 'handoff-artifact/v1';

export type HandoffStatus = 'created' | 'handed_off';

export type HandoffArtifact = {
  artifactId: string;
  schemaVersion: typeof HANDOFF_ARTIFACT_SCHEMA_VERSION;
  moduleId: string;
  moduleName: string;
  createdAt: string;
  targetProviderId: string;
  handoffStatus: HandoffStatus;
  generationPayloadSnapshot: GenerationPayloadMinimal;
  promptSnapshot: {
    title: string;
    promptText: string;
  };
  providerResponse: {
    providerId: string;
    status: HandoffStatus;
    summary: string;
  };
};
