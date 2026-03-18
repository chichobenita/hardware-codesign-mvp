import type { HandoffProvider } from './providerTypes';

export const MOCK_PROVIDER_ID = 'mock-local-hdl';
export const MOCK_STRUCTURED_PROVIDER_ID = 'mock-structured-hdl';

export const mockLocalHdlProvider: HandoffProvider = {
  id: MOCK_PROVIDER_ID,
  label: 'Mock Local HDL',
  description: 'Frontend-only deterministic handoff adapter for MVP artifact flow.',
  handoffArtifact: (artifact) => ({
    providerId: MOCK_PROVIDER_ID,
    status: 'handed_off',
    summary: `Mock provider accepted ${artifact.moduleName} locally.`
  })
};

export const mockStructuredHdlProvider: HandoffProvider = {
  id: MOCK_STRUCTURED_PROVIDER_ID,
  label: 'Mock Structured HDL',
  description: 'Alternate frontend-only mock provider for exercising provider selection in MVP review/handoff flow.',
  handoffArtifact: (artifact) => ({
    providerId: MOCK_STRUCTURED_PROVIDER_ID,
    status: 'handed_off',
    summary: `Structured mock provider accepted ${artifact.moduleName} locally.`
  })
};
