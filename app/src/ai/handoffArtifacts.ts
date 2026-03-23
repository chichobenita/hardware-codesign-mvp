import { deriveGenerationPayloadMinimalV1, getAuthoritativeModuleName } from '../../../shared/src';
import type { DesignState } from '../types';
import { buildHdlGenerationPromptFromState } from './promptBuilder';
import { HANDOFF_ARTIFACT_SCHEMA_VERSION, type HandoffArtifact } from './handoffTypes';
import type { ProviderHandoffResult } from './providers/providerTypes';
import { getHandoffProvider } from './providers/providerRegistry';
import { createProviderInvocationRequest } from './providers/providerRequests';

function sanitizeArtifactSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

export function createHandoffArtifactId(moduleId: string, createdAt: string): string {
  return `handoff_${sanitizeArtifactSegment(moduleId)}_${createdAt.replace(/[:.]/g, '-')}`;
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `hf_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function buildArtifactConsistencySnapshot(state: DesignState, moduleId: string) {
  const moduleNode = state.moduleList.find((item) => item.id === moduleId);
  const modulePackage = state.packageContentByModuleId[moduleId];
  const prompt = buildHdlGenerationPromptFromState(state, moduleId);

  if (!moduleNode || !modulePackage || !prompt) {
    return null;
  }

  return {
    moduleId,
    moduleName: getAuthoritativeModuleName(moduleId, modulePackage, moduleNode.name),
    payload: deriveGenerationPayloadMinimalV1(modulePackage),
    promptTitle: prompt.title,
    promptText: prompt.promptText
  };
}

export function createArtifactConsistencyMarkerFromState(state: DesignState, moduleId: string): string | null {
  const snapshot = buildArtifactConsistencySnapshot(state, moduleId);

  if (!snapshot) {
    return null;
  }

  return hashString(JSON.stringify(snapshot));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isHandoffArtifactRecord(value: unknown): value is HandoffArtifact {
  return (
    isRecord(value)
    && typeof value.artifactId === 'string'
    && value.schemaVersion === HANDOFF_ARTIFACT_SCHEMA_VERSION
    && typeof value.moduleId === 'string'
    && typeof value.moduleName === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.targetProviderId === 'string'
    && (value.handoffStatus === 'prepared' || value.handoffStatus === 'handed_off' || value.handoffStatus === 'stale')
    && typeof value.consistencyMarker === 'string'
    && isRecord(value.promptSnapshot)
    && typeof value.promptSnapshot.title === 'string'
    && typeof value.promptSnapshot.promptText === 'string'
    && isRecord(value.providerResponse)
    && typeof value.providerResponse.providerId === 'string'
    && (value.providerResponse.status === 'prepared' || value.providerResponse.status === 'handed_off')
    && typeof value.providerResponse.summary === 'string'
  );
}

export function normalizeHandoffArtifacts(state: DesignState, artifacts: HandoffArtifact[]): HandoffArtifact[] {
  return artifacts.flatMap((artifact) => {
    if (!isHandoffArtifactRecord(artifact)) {
      return [];
    }

    const currentConsistencyMarker = createArtifactConsistencyMarkerFromState(state, artifact.moduleId);
    if (!currentConsistencyMarker) {
      return [];
    }

    const currentStatus = artifact.consistencyMarker === currentConsistencyMarker
      ? artifact.providerResponse.status
      : 'stale';

    return [{
      ...artifact,
      handoffStatus: currentStatus
    }];
  });
}

export function createPreparedHandoffArtifactFromState(
  state: DesignState,
  moduleId: string,
  targetProviderId: string,
  createdAt: string
): HandoffArtifact | null {
  const moduleNode = state.moduleList.find((item) => item.id === moduleId);
  const modulePackage = state.packageContentByModuleId[moduleId];
  const prompt = buildHdlGenerationPromptFromState(state, moduleId);
  const consistencyMarker = createArtifactConsistencyMarkerFromState(state, moduleId);

  if (!moduleNode || !modulePackage || !prompt || !consistencyMarker) {
    return null;
  }

  const payload = deriveGenerationPayloadMinimalV1(modulePackage);
  const moduleName = getAuthoritativeModuleName(moduleId, modulePackage, moduleNode.name);
  const provider = getHandoffProvider(targetProviderId);

  return {
    artifactId: createHandoffArtifactId(moduleId, createdAt),
    schemaVersion: HANDOFF_ARTIFACT_SCHEMA_VERSION,
    moduleId,
    moduleName,
    createdAt,
    targetProviderId: provider.id,
    handoffStatus: 'prepared',
    consistencyMarker,
    generationPayloadSnapshot: payload,
    promptSnapshot: {
      title: prompt.title,
      promptText: prompt.promptText
    },
    providerResponse: {
      providerId: provider.id,
      status: 'prepared',
      summary: `Prepared handoff artifact for ${moduleName}.`
    }
  };
}

export function applyProviderResultToArtifact(artifact: HandoffArtifact, providerResponse: ProviderHandoffResult): HandoffArtifact {
  return {
    ...artifact,
    handoffStatus: providerResponse.status,
    providerResponse
  };
}

export function createHandoffArtifactFromState(
  state: DesignState,
  moduleId: string,
  targetProviderId: string,
  createdAt: string
): HandoffArtifact | null {
  const artifact = createPreparedHandoffArtifactFromState(state, moduleId, targetProviderId, createdAt);
  if (!artifact) {
    return null;
  }

  const provider = getHandoffProvider(targetProviderId);
  return applyProviderResultToArtifact(artifact, provider.buildPreparedResult(createProviderInvocationRequest(artifact)));
}
