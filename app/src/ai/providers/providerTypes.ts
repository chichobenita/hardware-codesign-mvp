import type { HandoffArtifact, HandoffStatus } from '../handoffTypes';

export type ProviderHandoffResult = {
  providerId: string;
  status: HandoffStatus;
  summary: string;
};

export type HandoffProvider = {
  id: string;
  label: string;
  description: string;
  handoffArtifact: (artifact: HandoffArtifact) => ProviderHandoffResult;
};
