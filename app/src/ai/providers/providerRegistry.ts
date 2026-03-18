import { mockLocalHdlProvider, mockStructuredHdlProvider, MOCK_PROVIDER_ID } from './mockProvider';
import type { HandoffProvider } from './providerTypes';

const providers: HandoffProvider[] = [mockLocalHdlProvider, mockStructuredHdlProvider];

export const DEFAULT_PROVIDER_ID = MOCK_PROVIDER_ID;

export function listHandoffProviders(): HandoffProvider[] {
  return [...providers];
}

export function getHandoffProvider(providerId: string): HandoffProvider {
  return providers.find((provider) => provider.id === providerId) ?? mockLocalHdlProvider;
}

export function isHandoffProviderId(providerId: string): boolean {
  return providers.some((provider) => provider.id === providerId);
}

export function normalizeHandoffProviderId(providerId: string): string {
  return isHandoffProviderId(providerId) ? providerId : DEFAULT_PROVIDER_ID;
}
