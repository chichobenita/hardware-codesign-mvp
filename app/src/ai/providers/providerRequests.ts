import type { HandoffArtifact } from '../handoffTypes';
import type { ProviderInvocationRequest } from './providerTypes';

export function createProviderInvocationRequest(artifact: HandoffArtifact): ProviderInvocationRequest {
  return {
    artifactId: artifact.artifactId,
    providerId: artifact.targetProviderId,
    moduleId: artifact.moduleId,
    moduleName: artifact.moduleName,
    createdAt: artifact.createdAt,
    generationPayload: artifact.generationPayloadSnapshot,
    prompt: {
      title: artifact.promptSnapshot.title,
      text: artifact.promptSnapshot.promptText
    }
  };
}
