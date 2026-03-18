import { getAuthoritativeModuleName } from '../../../shared/src';
import type { DesignState } from '../types';
import { buildHdlGenerationPromptFromState } from './promptBuilder';
import { HANDOFF_ARTIFACT_SCHEMA_VERSION, type HandoffArtifact } from './handoffTypes';
import { getHandoffProvider } from './providers/providerRegistry';
import { deriveGenerationPayloadMinimalV1 } from '../../../shared/src';

function sanitizeArtifactSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

export function createHandoffArtifactId(moduleId: string, createdAt: string): string {
  return `handoff_${sanitizeArtifactSegment(moduleId)}_${createdAt.replace(/[:.]/g, '-')}`;
}

export function createHandoffArtifactFromState(
  state: DesignState,
  moduleId: string,
  targetProviderId: string,
  createdAt: string
): HandoffArtifact | null {
  const moduleNode = state.moduleList.find((item) => item.id === moduleId);
  const modulePackage = state.packageContentByModuleId[moduleId];
  const prompt = buildHdlGenerationPromptFromState(state, moduleId);

  if (!moduleNode || !modulePackage || !prompt) {
    return null;
  }

  const payload = deriveGenerationPayloadMinimalV1(modulePackage);
  const moduleName = getAuthoritativeModuleName(moduleId, modulePackage, moduleNode.name);
  const provider = getHandoffProvider(targetProviderId);

  const createdArtifact: HandoffArtifact = {
    artifactId: createHandoffArtifactId(moduleId, createdAt),
    schemaVersion: HANDOFF_ARTIFACT_SCHEMA_VERSION,
    moduleId,
    moduleName,
    createdAt,
    targetProviderId: provider.id,
    handoffStatus: 'created',
    generationPayloadSnapshot: payload,
    promptSnapshot: {
      title: prompt.title,
      promptText: prompt.promptText
    },
    providerResponse: {
      providerId: provider.id,
      status: 'created',
      summary: `Prepared handoff artifact for ${moduleName}.`
    }
  };

  const providerResponse = provider.handoffArtifact(createdArtifact);

  return {
    ...createdArtifact,
    handoffStatus: providerResponse.status,
    providerResponse
  };
}
