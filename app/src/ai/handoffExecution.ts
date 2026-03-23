import type { HandoffArtifact } from './handoffTypes';
import { getHandoffProvider } from './providers/providerRegistry';
<<<<<<< HEAD
import { createProviderInvocationRequest } from './providers/providerRequests';
=======
>>>>>>> origin/main
import { createProviderJobId, type ProviderJob } from './providerJobTypes';

export function createPendingProviderJob(artifact: HandoffArtifact, startedAt: string, previousAttempts = 0): ProviderJob {
  return {
    jobId: createProviderJobId(artifact.artifactId, startedAt),
    artifactId: artifact.artifactId,
    moduleId: artifact.moduleId,
    targetProviderId: artifact.targetProviderId,
    status: 'pending',
    createdAt: startedAt,
    startedAt,
    attemptCount: previousAttempts + 1,
    retryable: true
  };
}

export async function executeProviderHandoff(artifact: HandoffArtifact) {
  const provider = getHandoffProvider(artifact.targetProviderId);
<<<<<<< HEAD
  return provider.executePreparedRequest(createProviderInvocationRequest(artifact));
=======
  return provider.executeHandoffArtifact(artifact);
>>>>>>> origin/main
}
