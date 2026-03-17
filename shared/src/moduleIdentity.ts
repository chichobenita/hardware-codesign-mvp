import type { ModulePackage } from './types';

export const FALLBACK_MODULE_NAME = 'unnamed_module';

export function normalizeModuleName(value: string | undefined): string {
  const clean = value?.trim() ?? '';
  return clean.length > 0 ? clean : FALLBACK_MODULE_NAME;
}

/**
 * Module identity source of truth for MVP:
 * ModulePackage.identity.name is authoritative.
 * Other views (for example app module lists) should project from this field.
 */
export function getAuthoritativeModuleName(moduleId: string, modulePackage?: ModulePackage, fallbackName?: string): string {
  const identityName = normalizeModuleName(modulePackage?.identity?.name);
  if (identityName !== FALLBACK_MODULE_NAME) {
    return identityName;
  }

  return normalizeModuleName(fallbackName ?? moduleId);
}
