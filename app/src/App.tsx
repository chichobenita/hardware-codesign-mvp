import { useEffect, useMemo, useState } from 'react';
import { deriveGenerationPayloadMinimalV1, type GenerationPayloadMinimal, type ModulePackage } from '../../shared/src';
import { getTransitionReadiness } from './packageLifecycle';
import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';

import type {
  Connection,
  DesignState,
  ModuleNode,
  PackageSectionStatus,
  PersistedDesignState,
  SectionKey,
  SuggestionCard,
  WorkspaceMode
} from './types';

function dependencyEntry(kind: 'upstream' | 'downstream', moduleName: string, signal: string): string {
  const cleanSignal = signal.trim();
  return cleanSignal.length > 0 ? `${kind}:${moduleName}:${cleanSignal}` : `${kind}:${moduleName}`;
}

function withConnectionDependencies(current: DesignState, connection: Connection): DesignState {
  const sourcePackage = current.packageContentByModuleId[connection.fromModuleId];
  const targetPackage = current.packageContentByModuleId[connection.toModuleId];

  if (!sourcePackage || !targetPackage) {
    return current;
  }

  const sourceName = sourcePackage.identity?.name ?? connection.fromModuleId;
  const targetName = targetPackage.identity?.name ?? connection.toModuleId;

  const sourceDependencies = sourcePackage.dependencies?.relevantDependencies ?? [];
  const targetDependencies = targetPackage.dependencies?.relevantDependencies ?? [];
  const downstreamItem = dependencyEntry('downstream', targetName, connection.signal);
  const upstreamItem = dependencyEntry('upstream', sourceName, connection.signal);

  return {
    ...current,
    packageContentByModuleId: {
      ...current.packageContentByModuleId,
      [connection.fromModuleId]: {
        ...sourcePackage,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...sourcePackage.dependencies,
          relevantDependencies: sourceDependencies.includes(downstreamItem)
            ? sourceDependencies
            : [...sourceDependencies, downstreamItem]
        }
      },
      [connection.toModuleId]: {
        ...targetPackage,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'mock_user',
        dependencies: {
          ...targetPackage.dependencies,
          relevantDependencies: targetDependencies.includes(upstreamItem)
            ? targetDependencies
            : [...targetDependencies, upstreamItem]
        }
      }
    }
  };
}

function createMockSuggestions(moduleNode: ModuleNode, modulePackage: ModulePackage): SuggestionCard[] {
  const moduleName = modulePackage.identity?.name ?? moduleNode.name;
  const hasChildren = (modulePackage.hierarchy?.childModuleIds?.length ?? 0) > 0;

  return [
    {
      id: `${moduleNode.id}-purpose`,
      type: 'purpose_proposal',
      title: 'Purpose proposal',
      description: 'Suggested purpose statement. Accept will update Module Package → Purpose.',
      status: 'pending',
      draft: {
        summaryText: `Coordinate ${moduleName} data flow and expose a stable contract to peer modules.`
      }
    },
    {
      id: `${moduleNode.id}-behavior`,
      type: 'behavior_summary',
      title: 'Behavior summary',
      description: 'Suggested behavior summary. Accept will update Module Package → Behavior summary.',
      status: 'pending',
      draft: {
        summaryText: `On each valid cycle, ${moduleName} consumes inputs, applies internal control rules, and updates outputs deterministically.`
      }
    },
    {
      id: `${moduleNode.id}-ports`,
      type: 'ports_suggestion',
      title: 'Ports suggestion',
      description: 'Suggested interface ports. Accept will replace Module Package → Interfaces ports.',
      status: 'pending',
      draft: {
        ports: [
          { id: `${moduleNode.id}_clk`, name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: `${moduleNode.id}_rst_n`, name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: `${moduleNode.id}_valid_i`, name: 'valid_i', direction: 'input', width: '1', description: 'Input valid handshake' },
          { id: `${moduleNode.id}_ready_o`, name: 'ready_o', direction: 'output', width: '1', description: 'Output ready handshake' }
        ]
      }
    },
    {
      id: `${moduleNode.id}-decomposition`,
      type: 'decomposition_suggestion',
      title: 'Decomposition suggestion',
      description: 'Suggested decomposition status. Accept will update Module Package → Decomposition status.',
      status: 'pending',
      draft: {
        decompositionStatus: hasChildren ? 'composite' : 'candidate_leaf',
        decompositionRationale: hasChildren
          ? `${moduleName} already coordinates sub-modules and should remain composite.`
          : `${moduleName} looks self-contained enough to evaluate as a leaf candidate.`
      }
    }
  ];
}

function listStatus(values: string[]): Exclude<PackageSectionStatus, 'needs_review'> {
  if (values.length === 0) {
    return 'empty';
  }

  const filled = values.filter((value) => value.trim().length > 0).length;
  if (filled === 0) {
    return 'empty';
  }
  if (filled === values.length) {
    return 'complete';
  }
  return 'partial';
}

function markNeedsReview(baseStatus: Exclude<PackageSectionStatus, 'needs_review'>, shouldMarkReview: boolean): PackageSectionStatus {
  if (!shouldMarkReview || baseStatus === 'empty') {
    return baseStatus;
  }
  return 'needs_review';
}

function sectionStatuses(modulePackage: ModulePackage): Record<SectionKey, PackageSectionStatus> {
  const reviewMode = modulePackage.packageStatus === 'under_review';

  const interfaceValues = (modulePackage.interfaces?.ports ?? []).flatMap((port) => [port.name ?? '', port.direction ?? '', port.width ?? '']);
  const behaviorValues = [
    modulePackage.behavior?.behaviorSummary ?? '',
    modulePackage.behavior?.operationalDescription ?? '',
    modulePackage.behavior?.clockResetNotes ?? '',
    ...(modulePackage.behavior?.behaviorRules ?? [])
  ];
  const constraintValues = [
    ...(modulePackage.constraints?.timingConstraints ?? []),
    ...(modulePackage.constraints?.latencyConstraints ?? []),
    ...(modulePackage.constraints?.throughputConstraints ?? []),
    ...(modulePackage.constraints?.basicConstraints ?? [])
  ];

  return {
    identity: markNeedsReview(listStatus([modulePackage.identity?.name ?? '', modulePackage.identity?.description ?? '']), reviewMode),
    hierarchy: markNeedsReview(
      listStatus([
        modulePackage.hierarchy?.parentModuleId ?? '',
        ...(modulePackage.hierarchy?.childModuleIds ?? []),
        ...(modulePackage.hierarchy?.hierarchyPath ?? [])
      ]),
      reviewMode
    ),
    interfaces: markNeedsReview(listStatus(interfaceValues), reviewMode),
    purpose: markNeedsReview(listStatus([modulePackage.purpose?.summary ?? '']), reviewMode),
    behavior: markNeedsReview(listStatus(behaviorValues), reviewMode),
    constraints: markNeedsReview(listStatus(constraintValues), reviewMode),
    dependenciesAndInteractions: markNeedsReview(listStatus(modulePackage.dependencies?.relevantDependencies ?? []), reviewMode),
    decompositionStatus: markNeedsReview(
      listStatus([
        modulePackage.decompositionStatus?.decompositionStatus ?? '',
        modulePackage.decompositionStatus?.decompositionRationale ?? '',
        modulePackage.decompositionStatus?.stopReason ?? '',
        modulePackage.decompositionStatus?.furtherDecompositionNotes ?? ''
      ]),
      reviewMode
    )
  };
}

const seedState: DesignState = {
  moduleList: [
    { id: 'root', name: 'top_controller', kind: 'composite' },
    { id: 'child_a', name: 'input_fifo', kind: 'leaf' },
    { id: 'child_b', name: 'scheduler', kind: 'leaf' },
    { id: 'example_uart_rx', name: 'uart_rx', kind: 'leaf' }
  ],
  selectedModuleId: 'example_uart_rx',
  connections: [
    { fromModuleId: 'child_a', toModuleId: 'root', signal: 'fifo_out' },
    { fromModuleId: 'root', toModuleId: 'child_b', signal: 'dispatch_cmd' },
    { fromModuleId: 'example_uart_rx', toModuleId: 'root', signal: 'uart_data_byte' }
  ],
  packageContentByModuleId: {
    root: {
      packageId: 'pkg_root',
      moduleId: 'root',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'top_controller', description: 'Top-level orchestrator for subsystem coordination.' },
      hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b'], hierarchyPath: ['top_controller'] },
      interfaces: { ports: [{ id: 'cfg_bus', name: 'cfg_bus', direction: 'input', width: '32' }, { id: 'data_out', name: 'data_out', direction: 'output', width: '32' }] },
      purpose: { summary: 'Coordinates data flow and control decisions.' },
      decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: 'Still splitting control and data scheduling.', furtherDecompositionNotes: 'Need one more refinement pass.' }
    },
    child_a: {
      packageId: 'pkg_child_a',
      moduleId: 'child_a',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'input_fifo' },
      interfaces: { ports: [{ id: 'data_in', name: 'data_in', direction: 'input' }, { id: 'fifo_out', name: 'fifo_out', direction: 'output' }] },
      purpose: { summary: '' }
    },
    child_b: {
      packageId: 'pkg_child_b',
      moduleId: 'child_b',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'scheduler' },
      interfaces: { ports: [] },
      purpose: { summary: '' }
    },
    example_uart_rx: {
      packageId: 'pkg_example_uart_rx',
      moduleId: 'example_uart_rx',
      packageVersion: '0.1.0',
      packageStatus: 'partially_defined',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: 'uart_rx', description: 'UART receiver converting serial stream to bytes.' },
      hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'uart_rx'] },
      interfaces: {
        ports: [
          { id: 'clk', name: 'clk', direction: 'input', width: '1', description: 'System clock' },
          { id: 'rst_n', name: 'rst_n', direction: 'input', width: '1', description: 'Active-low reset' },
          { id: 'rx_i', name: 'rx_i', direction: 'input', width: '1', description: 'UART serial input' },
          { id: 'data_o', name: 'data_o', direction: 'output', width: '8', description: 'Received byte' }
        ]
      },
      purpose: { summary: 'Receives UART serial data and emits decoded bytes.' },
      constraints: { basicConstraints: ['115200 baud nominal', '8-N-1 format'] },
      dependencies: { relevantDependencies: ['system clock', 'upstream UART TX timing assumptions'] },
      behavior: {
        behaviorSummary: 'Detect start bit, sample 8 data bits, emit output byte.',
        behaviorRules: ['Sample start bit midpoint before data bits', 'Assert data_o only after a full valid frame'],
        clockResetNotes: 'Synchronous to clk. rst_n clears RX state machine and output valid flags.'
      },
      decompositionStatus: { decompositionStatus: 'approved_leaf', decompositionRationale: 'Simple block with clear fixed behavior.', stopRecommendedBy: 'system' }
    }
  },
  handedOffAtByModuleId: {}
};

const LOCAL_STORAGE_KEY = 'hardware-codesign-mvp.design-state.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isModuleNode(value: unknown): value is ModuleNode {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.kind === 'composite' || value.kind === 'leaf')
  );
}

function isConnection(value: unknown): value is Connection {
  return (
    isRecord(value)
    && typeof value.fromModuleId === 'string'
    && typeof value.toModuleId === 'string'
    && typeof value.signal === 'string'
  );
}

function isStringMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isPackageMap(value: unknown): value is Record<string, ModulePackage> {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item));
}

function parsePersistedState(raw: string): PersistedDesignState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    if (!Array.isArray(parsed.moduleList) || !parsed.moduleList.every(isModuleNode)) {
      return null;
    }
    if (typeof parsed.selectedModuleId !== 'string') {
      return null;
    }
    if (!Array.isArray(parsed.connections) || !parsed.connections.every(isConnection)) {
      return null;
    }
    if (!isPackageMap(parsed.packageContentByModuleId)) {
      return null;
    }

    const handedOffAtByModuleId = isStringMap(parsed.handedOffAtByModuleId) ? parsed.handedOffAtByModuleId : {};

    return {
      moduleList: parsed.moduleList,
      selectedModuleId: parsed.selectedModuleId,
      connections: parsed.connections,
      packageContentByModuleId: parsed.packageContentByModuleId,
      handedOffAtByModuleId
    };
  } catch {
    return null;
  }
}

function loadDesignState(): DesignState {
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return seedState;
  }

  const persisted = parsePersistedState(raw);
  if (!persisted) {
    return seedState;
  }

  const moduleIds = new Set(persisted.moduleList.map((moduleNode) => moduleNode.id));
  const hasSelectedModule = moduleIds.has(persisted.selectedModuleId);
  if (!hasSelectedModule || persisted.moduleList.length === 0) {
    return seedState;
  }

  const hasPackagesForModules = persisted.moduleList.every((moduleNode) => Boolean(persisted.packageContentByModuleId[moduleNode.id]));
  if (!hasPackagesForModules) {
    return seedState;
  }

  return persisted;
}

function saveDesignState(state: DesignState): void {
  const snapshot: PersistedDesignState = {
    moduleList: state.moduleList,
    selectedModuleId: state.selectedModuleId,
    connections: state.connections,
    packageContentByModuleId: state.packageContentByModuleId,
    handedOffAtByModuleId: state.handedOffAtByModuleId
  };

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
}

export function App(): JSX.Element {
  const [state, setState] = useState<DesignState>(() => loadDesignState());
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('design');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleKind, setNewModuleKind] = useState<ModuleNode['kind']>('leaf');
  const [renameDraft, setRenameDraft] = useState('');
  const [connectionDraft, setConnectionDraft] = useState<Connection>({
    fromModuleId: seedState.moduleList[0].id,
    toModuleId: seedState.moduleList[1].id,
    signal: ''
  });
  const [suggestionsByModuleId, setSuggestionsByModuleId] = useState<Record<string, SuggestionCard[]>>({});

  const selectedModule = state.moduleList.find((moduleNode) => moduleNode.id === state.selectedModuleId) ?? state.moduleList[0];
  const currentPackageContent = state.packageContentByModuleId[state.selectedModuleId];
  const currentSectionStatuses = useMemo(() => sectionStatuses(currentPackageContent), [currentPackageContent]);
  const moduleConnections = state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId);
  const generatedPayload: GenerationPayloadMinimal = useMemo(() => deriveGenerationPayloadMinimalV1(currentPackageContent), [currentPackageContent]);
  const transitionReadiness = useMemo(() => getTransitionReadiness(currentPackageContent), [currentPackageContent]);
  const approvedLeafReadyModules = useMemo(
    () =>
      state.moduleList.filter((moduleNode) => {
        const modulePackage = state.packageContentByModuleId[moduleNode.id];
        if (!modulePackage) {
          return false;
        }

        const isLeafReadyPackage = modulePackage.packageStatus === 'leaf_ready' || modulePackage.packageStatus === 'handed_off';
        const isApprovedLeaf = modulePackage.decompositionStatus?.decompositionStatus === 'approved_leaf';
        return moduleNode.kind === 'leaf' && isLeafReadyPackage && isApprovedLeaf;
      }),
    [state.moduleList, state.packageContentByModuleId]
  );
  const canShowPayloadPreview = useMemo(() => {
    const isReviewOrHandoffMode = workspaceMode === 'review' || workspaceMode === 'handoff';
    const isLeafReadyPackage = currentPackageContent.packageStatus === 'leaf_ready' || currentPackageContent.packageStatus === 'handed_off';
    const isApprovedLeaf = currentPackageContent.decompositionStatus?.decompositionStatus === 'approved_leaf';
    const isLeafModule = selectedModule?.kind === 'leaf';

    return isReviewOrHandoffMode && isLeafReadyPackage && isApprovedLeaf && isLeafModule;
  }, [currentPackageContent, selectedModule?.kind, workspaceMode]);

  useEffect(() => {
    if (!selectedModule || suggestionsByModuleId[selectedModule.id]) {
      return;
    }

    setSuggestionsByModuleId((current) => ({
      ...current,
      [selectedModule.id]: createMockSuggestions(selectedModule, currentPackageContent)
    }));
  }, [currentPackageContent, selectedModule, suggestionsByModuleId]);

  useEffect(() => {
    saveDesignState(state);
  }, [state]);

  const selectedSuggestions = suggestionsByModuleId[state.selectedModuleId] ?? [];

  const updateCurrentPackage = (updater: (current: ModulePackage) => ModulePackage) => {
    setState((current) => {
      const currentPackage = current.packageContentByModuleId[current.selectedModuleId];
      const nextPackage = {
        ...updater(currentPackage),
        moduleId: current.selectedModuleId,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'mock_user'
      };

      return {
        ...current,
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: nextPackage
        },
        moduleList: current.moduleList.map((moduleNode) =>
          moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: nextPackage.identity?.name || 'unnamed_module' } : moduleNode
        )
      };
    });
  };

  const regenerateSuggestionsForSelectedModule = () => {
    if (!selectedModule) {
      return;
    }

    setSuggestionsByModuleId((current) => ({
      ...current,
      [selectedModule.id]: createMockSuggestions(selectedModule, currentPackageContent)
    }));
  };

  const updateSuggestion = (suggestionId: string, updater: (current: SuggestionCard) => SuggestionCard) => {
    setSuggestionsByModuleId((current) => {
      const moduleSuggestions = current[state.selectedModuleId] ?? [];
      return {
        ...current,
        [state.selectedModuleId]: moduleSuggestions.map((suggestion) =>
          suggestion.id === suggestionId ? updater(suggestion) : suggestion
        )
      };
    });
  };

  const rejectSuggestion = (suggestionId: string) => {
    updateSuggestion(suggestionId, (current) => ({ ...current, status: 'rejected' }));
  };

  const acceptSuggestion = (suggestion: SuggestionCard) => {
    updateCurrentPackage((current) => {
      if (suggestion.type === 'purpose_proposal') {
        return {
          ...current,
          purpose: {
            ...current.purpose,
            summary: suggestion.draft.summaryText ?? ''
          }
        };
      }

      if (suggestion.type === 'behavior_summary') {
        return {
          ...current,
          behavior: {
            ...current.behavior,
            behaviorSummary: suggestion.draft.summaryText ?? ''
          }
        };
      }

      if (suggestion.type === 'ports_suggestion') {
        return {
          ...current,
          interfaces: {
            ...current.interfaces,
            ports: suggestion.draft.ports ?? []
          }
        };
      }

      return {
        ...current,
        decompositionStatus: {
          decompositionStatus: suggestion.draft.decompositionStatus ?? 'under_decomposition',
          decompositionRationale: suggestion.draft.decompositionRationale ?? '',
          stopReason: current.decompositionStatus?.stopReason,
          stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
          furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
        }
      };
    });

    updateSuggestion(suggestion.id, (current) => ({ ...current, status: 'accepted' }));
  };

  const moveToNextPackageState = () => {
    if (!transitionReadiness || !transitionReadiness.canTransition) {
      return;
    }

    updateCurrentPackage((current) => ({
      ...current,
      packageStatus: transitionReadiness.to
    }));
  };

  const createModule = () => {
    const cleanName = newModuleName.trim() || 'unnamed_module';
    const nextId = `${cleanName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
    const newPackage: ModulePackage = {
      packageId: `pkg_${nextId}`,
      moduleId: nextId,
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'mock_user',
      identity: { name: cleanName },
      hierarchy: { parentModuleId: '', childModuleIds: [], hierarchyPath: [cleanName] },
      interfaces: { ports: [] },
      purpose: { summary: '' },
      constraints: { basicConstraints: [] },
      dependencies: { relevantDependencies: [] },
      behavior: { behaviorRules: [], clockResetNotes: '' },
      decompositionStatus: { decompositionStatus: 'under_decomposition', decompositionRationale: '' }
    };

    setState((current) => ({
      ...current,
      moduleList: [...current.moduleList, { id: nextId, name: cleanName, kind: newModuleKind }],
      selectedModuleId: nextId,
      packageContentByModuleId: { ...current.packageContentByModuleId, [nextId]: newPackage }
    }));

    setRenameDraft(cleanName);
    setConnectionDraft((current) => ({ ...current, toModuleId: nextId }));
  };

  const renameSelectedModule = () => {
    const cleanName = renameDraft.trim();
    if (!cleanName) {
      return;
    }

    setState((current) => {
      const selectedPackage = current.packageContentByModuleId[current.selectedModuleId];
      if (!selectedPackage) {
        return current;
      }

      return {
        ...current,
        moduleList: current.moduleList.map((moduleNode) =>
          moduleNode.id === current.selectedModuleId ? { ...moduleNode, name: cleanName } : moduleNode
        ),
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: {
            ...selectedPackage,
            lastUpdatedAt: new Date().toISOString(),
            lastUpdatedBy: 'mock_user',
            identity: {
              ...selectedPackage.identity,
              name: cleanName
            }
          }
        }
      };
    });
  };

  const addConnection = () => {
    const nextConnection = { ...connectionDraft, signal: connectionDraft.signal.trim() };
    if (!nextConnection.fromModuleId || !nextConnection.toModuleId || !nextConnection.signal) {
      return;
    }

    setState((current) => {
      const withConnection = {
        ...current,
        connections: [...current.connections, nextConnection]
      };
      return withConnectionDependencies(withConnection, nextConnection);
    });
  };

  const markSelectedModuleAsHandedOff = () => {
    const nowIso = new Date().toISOString();
    setState((current) => {
      const selectedPackage = current.packageContentByModuleId[current.selectedModuleId];
      if (!selectedPackage) {
        return current;
      }

      return {
        ...current,
        packageContentByModuleId: {
          ...current.packageContentByModuleId,
          [current.selectedModuleId]: {
            ...selectedPackage,
            packageStatus: 'handed_off',
            lastUpdatedAt: nowIso,
            lastUpdatedBy: 'mock_user'
          }
        },
        handedOffAtByModuleId: {
          ...current.handedOffAtByModuleId,
          [current.selectedModuleId]: nowIso
        }
      };
    });
  };

  const selectedModuleHandedOffAt = state.handedOffAtByModuleId[state.selectedModuleId];
  const isSelectedModuleHandoffReady = approvedLeafReadyModules.some((moduleNode) => moduleNode.id === state.selectedModuleId);

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP — Main Workspace</header>
      <main className="workspace-grid">
        <AISuggestionsPanel
          selectedModule={selectedModule}
          regenerateSuggestionsForSelectedModule={regenerateSuggestionsForSelectedModule}
          selectedSuggestions={selectedSuggestions}
          updateSuggestion={updateSuggestion}
          acceptSuggestion={acceptSuggestion}
          rejectSuggestion={rejectSuggestion}
        />

        <DiagramWorkspace
          state={state}
          newModuleName={newModuleName}
          setNewModuleName={(value) => setNewModuleName(value)}
          newModuleKind={newModuleKind}
          setNewModuleKind={setNewModuleKind}
          createModule={createModule}
          setState={setState}
          renameDraft={renameDraft}
          setRenameDraft={(value) => setRenameDraft(value)}
          selectedModule={selectedModule}
          renameSelectedModule={renameSelectedModule}
          connectionDraft={connectionDraft}
          setConnectionDraft={setConnectionDraft}
          addConnection={addConnection}
        />

        <ModulePackagePanel
          selectedModule={selectedModule}
          state={state}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
          currentPackageContent={currentPackageContent}
          transitionReadiness={transitionReadiness}
          moveToNextPackageState={moveToNextPackageState}
          currentSectionStatuses={currentSectionStatuses}
          updateCurrentPackage={updateCurrentPackage}
          moduleConnections={moduleConnections}
          canShowPayloadPreview={canShowPayloadPreview}
          generatedPayload={generatedPayload}
          approvedLeafReadyModules={approvedLeafReadyModules}
          setState={setState}
          markSelectedModuleAsHandedOff={markSelectedModuleAsHandedOff}
          isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
          selectedModuleHandedOffAt={selectedModuleHandedOffAt}
        />
      </main>
    </div>
  );
}

export default App;
