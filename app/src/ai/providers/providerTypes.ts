import type { HandoffArtifact } from '../handoffTypes';

export type ProviderHandoffResult = {
  providerId: string;
  status: 'prepared' | 'handed_off';
  summary: string;
};

export type HandoffProvider = {
  id: string;
  label: string;
  description: string;
  handoffArtifact: (artifact: HandoffArtifact) => ProviderHandoffResult;
};
