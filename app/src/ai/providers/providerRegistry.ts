import { mockLocalHdlProvider, mockStructuredHdlProvider, MOCK_PROVIDER_ID } from './mockProvider';
import type { HandoffProvider } from './providerTypes';

const providers: HandoffProvider[] = [mockLocalHdlProvider, mockStructuredHdlProvider];

export const DEFAULT_PROVIDER_ID = MOCK_PROVIDER_ID;

export function listHandoffProviders(): HandoffProvider[] {
  return providers;
}

export function getHandoffProvider(providerId: string): HandoffProvider {
  return providers.find((provider) => provider.id === providerId) ?? mockLocalHdlProvider;
}
