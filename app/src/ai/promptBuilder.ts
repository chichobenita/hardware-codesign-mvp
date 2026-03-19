import { deriveGenerationPayloadMinimalV1, getAuthoritativeModuleName, type ModulePackage } from '../../../shared/src';
import type { ModuleNode } from '../../../shared/src';
import type { DesignState } from '../types';
import type { PromptBuildInput, PromptBuildResult, PromptHierarchyContext } from './promptTypes';

function cleanText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function cleanList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function formatBulletList(values: string[], emptyLabel: string): string[] {
  if (values.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return values.map((value) => `- ${value}`);
}

function formatNumberedList(values: string[], emptyLabel: string): string[] {
  if (values.length === 0) {
    return [`1. ${emptyLabel}`];
  }

  return values.map((value, index) => `${index + 1}. ${value}`);
}

function formatPorts(input: PromptBuildInput): string[] {
  if (input.payload.ports.length === 0) {
    return ['- No ports were defined in the normalized package.'];
  }

  return input.payload.ports.map((port) => {
    const width = cleanText(port.width) || '1';
    const description = cleanText(port.description);
    return description.length > 0
      ? `- ${port.direction} ${port.name} [${width}] — ${description}`
      : `- ${port.direction} ${port.name} [${width}]`;
  });
}

function formatHierarchyContext(hierarchyContext: PromptHierarchyContext | undefined): string[] {
  if (!hierarchyContext) {
    return ['- No stable hierarchy context is available beyond the module package itself.'];
  }

  return [
    `- Module kind: ${hierarchyContext.moduleKind}`,
    `- Parent module: ${hierarchyContext.parentModuleName}`,
    `- Hierarchy path: ${hierarchyContext.hierarchyPath.join(' > ')}`,
    `- Current role: ${hierarchyContext.roleSummary}`
  ];
}

export function buildHdlGenerationPrompt(input: PromptBuildInput): PromptBuildResult {
  const behaviorRules = cleanList(input.payload.behavior_rules);
  const basicConstraints = cleanList(input.payload.basic_constraints);
  const relevantDependencies = cleanList(input.payload.relevant_dependencies);
  const clockResetNotes = cleanText(input.payload.clock_reset_notes);
  const purposeSummary = cleanText(input.purposeSummary || input.payload.purpose);
  const moduleDescription = cleanText(input.moduleDescription);
  const behaviorSummary = cleanText(input.behaviorSummary);
  const operationalDescription = cleanText(input.operationalDescription);
  const interfaceNotes = cleanText(input.modulePackage.interfaces?.interfaceNotes);
  const cornerCases = cleanList(input.modulePackage.behavior?.cornerCases);
  const implementationNotes = cleanList(input.modulePackage.behavior?.implementationNotes);
  const integrationAssumptions = cleanList(input.modulePackage.dependencies?.integrationAssumptions);

  const lines = [
    'HDL Generation Prompt v1',
    '',
    'Target module',
    `- Module name: ${input.moduleName}`,
    `- Module id: ${input.moduleId}`,
    '',
    'Module identity',
    ...formatBulletList([
      ...(moduleDescription ? [`Description: ${moduleDescription}`] : []),
      `Purpose: ${purposeSummary || 'No purpose summary provided.'}`,
      ...(behaviorSummary ? [`Behavior summary: ${behaviorSummary}`] : []),
      ...(operationalDescription ? [`Operational notes: ${operationalDescription}`] : [])
    ], 'No additional module identity notes were provided.'),
    '',
    'Hierarchy context',
    ...formatHierarchyContext(input.hierarchyContext),
    '',
    'Ports',
    ...formatPorts(input),
    '',
    'Interface notes',
    ...formatBulletList(interfaceNotes ? [interfaceNotes] : [], 'No explicit interface notes were provided.'),
    '',
    'Behavior rules',
    ...formatNumberedList(behaviorRules, 'No explicit behavior rules were provided.'),
    '',
    'Corner cases',
    ...formatNumberedList(cornerCases, 'No explicit corner cases were provided.'),
    '',
    'Basic constraints',
    ...formatNumberedList(basicConstraints, 'No explicit basic constraints were provided.'),
    '',
    'Relevant dependencies',
    ...formatNumberedList(relevantDependencies, 'No relevant dependencies were provided.'),
    '',
    'Integration assumptions',
    ...formatNumberedList(integrationAssumptions, 'No explicit integration assumptions were provided.'),
    '',
    'Clock and reset notes',
    `- ${clockResetNotes || 'No explicit clock/reset notes were provided.'}`,
    '',
    'Implementation notes',
    ...formatNumberedList(implementationNotes, 'No explicit implementation notes were provided.'),
    '',
    'Implementation guidance',
    '- Preserve the declared module name and port names exactly.',
    '- Keep the implementation bounded to the stated purpose, behavior rules, constraints, and dependencies.',
    '- If a detail is unspecified, choose the simplest HDL implementation consistent with this prompt.'
  ];

  return {
    title: `HDL prompt for ${input.moduleName}`,
    promptText: lines.join('\n')
  };
}

function createHierarchyContext(
  state: DesignState,
  moduleNode: ModuleNode,
  modulePackage: ModulePackage
): PromptHierarchyContext | undefined {
  const hierarchyPath = cleanList(modulePackage.hierarchy?.hierarchyPath);
  const parentModuleId = cleanText(modulePackage.hierarchy?.parentModuleId);
  const parentModule = parentModuleId.length > 0
    ? state.moduleList.find((item) => item.id === parentModuleId)
    : undefined;
  const parentModuleName = parentModule
    ? getAuthoritativeModuleName(parentModule.id, state.packageContentByModuleId[parentModule.id], parentModule.name)
    : '';

  if (hierarchyPath.length === 0 && parentModuleName.length === 0) {
    return undefined;
  }

  const roleSummary = moduleNode.kind === 'leaf'
    ? (parentModuleName ? `Leaf implementation unit under ${parentModuleName}.` : 'Leaf implementation unit.')
    : (parentModuleName ? `Composite planning module under ${parentModuleName}.` : 'Composite planning module.');

  return {
    parentModuleName: parentModuleName || 'top-level scope',
    hierarchyPath: hierarchyPath.length > 0 ? hierarchyPath : [moduleNode.name],
    roleSummary,
    moduleKind: moduleNode.kind
  };
}

export function createPromptBuildInput(state: DesignState, moduleId: string): PromptBuildInput | null {
  const moduleNode = state.moduleList.find((item) => item.id === moduleId);
  const modulePackage = state.packageContentByModuleId[moduleId];
  if (!moduleNode || !modulePackage) {
    return null;
  }

  const payload = deriveGenerationPayloadMinimalV1(modulePackage);
  const moduleName = getAuthoritativeModuleName(moduleId, modulePackage, moduleNode.name);

  return {
    moduleId,
    moduleName,
    moduleDescription: cleanText(modulePackage.identity?.description),
    purposeSummary: cleanText(modulePackage.purpose?.summary),
    behaviorSummary: cleanText(modulePackage.behavior?.behaviorSummary),
    operationalDescription: cleanText(modulePackage.behavior?.operationalDescription),
    modulePackage,
    payload,
    hierarchyContext: createHierarchyContext(state, moduleNode, modulePackage)
  };
}

export function buildHdlGenerationPromptFromState(state: DesignState, moduleId: string): PromptBuildResult | null {
  const input = createPromptBuildInput(state, moduleId);
  return input ? buildHdlGenerationPrompt(input) : null;
}
