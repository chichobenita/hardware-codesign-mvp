import type { GenerationPayloadMinimal } from '../../../shared/src';
import type { ModuleNode } from '../types';

export type PromptHierarchyContext = {
  parentModuleName: string;
  hierarchyPath: string[];
  roleSummary: string;
  moduleKind: ModuleNode['kind'];
};

export type PromptBuildInput = {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  purposeSummary: string;
  behaviorSummary: string;
  operationalDescription: string;
  payload: GenerationPayloadMinimal;
  hierarchyContext?: PromptHierarchyContext;
};

export type PromptBuildResult = {
  title: string;
  promptText: string;
};
