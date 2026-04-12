import type { ProviderExecutionFailure, ProviderHandoffResult } from './providers/providerTypes';

export type ProviderJobStatus = 'pending' | 'success' | 'failure';

export type ProviderJob = {
  jobId: string;
  artifactId: string;
  moduleId: string;
  targetProviderId: string;
  status: ProviderJobStatus;
  createdAt: string;
  startedAt: string;
  completedAt?: string;
  attemptCount: number;
  retryable: boolean;
  result?: ProviderHandoffResult;
  error?: ProviderExecutionFailure;
};

function sanitizeJobSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'job';
}

export function createProviderJobId(artifactId: string, startedAt: string): string {
  return `provider_job_${sanitizeJobSegment(artifactId)}_${startedAt.replace(/[:.]/g, '-')}`;
}
