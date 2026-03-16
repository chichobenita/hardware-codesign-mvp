import type { GenerationPayloadMinimal, ModulePackage } from './types';

/**
 * Derive GenerationPayloadMinimal v1 from a ModulePackage using only v1 fields.
 */
export function deriveGenerationPayloadMinimalV1(modulePackage: ModulePackage): GenerationPayloadMinimal {
  return {
    module_name: modulePackage.identity?.name?.trim() || 'unnamed_module',
    ports:
      modulePackage.interfaces?.ports?.map((port) => ({
        name: port.name,
        direction: port.direction,
        width: port.width,
        description: port.description
      })) ?? [],
    purpose: modulePackage.purpose?.summary?.trim() || '',
    basic_constraints: modulePackage.constraints?.basicConstraints ?? [],
    relevant_dependencies: modulePackage.dependencies?.relevantDependencies ?? [],
    behavior_rules: modulePackage.behavior?.behaviorRules ?? [],
    clock_reset_notes: modulePackage.behavior?.clockResetNotes?.trim() || ''
  };
}
