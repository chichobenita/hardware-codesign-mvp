import type { GenerationPayloadMinimal } from '../../../shared/src';

export const HANDOFF_ARTIFACT_SCHEMA_VERSION = 'handoff-artifact/v1';

export type HandoffStatus = 'prepared' | 'handed_off' | 'stale';

export type HandoffArtifact = {
  artifactId: string;
  schemaVersion: typeof HANDOFF_ARTIFACT_SCHEMA_VERSION;
  moduleId: string;
  moduleName: string;
  createdAt: string;
  targetProviderId: string;
  handoffStatus: HandoffStatus;
  consistencyMarker: string;
  generationPayloadSnapshot: GenerationPayloadMinimal;
  promptSnapshot: {
    title: string;
    promptText: string;
  };
  providerResponse: {
    providerId: string;
    status: 'prepared' | 'handed_off';
    summary: string;
  };
};
