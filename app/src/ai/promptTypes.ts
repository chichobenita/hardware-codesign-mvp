import type { GenerationPayloadMinimal, ModuleKind, ModulePackage } from '../../../shared/src';

export type PromptHierarchyContext = {
  parentModuleName: string;
  hierarchyPath: string[];
  roleSummary: string;
  moduleKind: ModuleKind;
};

export type PromptBuildInput = {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
  purposeSummary: string;
  behaviorSummary: string;
  operationalDescription: string;
  modulePackage: ModulePackage;
  payload: GenerationPayloadMinimal;
  hierarchyContext?: PromptHierarchyContext;
};

export type PromptBuildResult = {
  title: string;
  promptText: string;
};
