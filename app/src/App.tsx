import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { deriveGenerationPayloadMinimalV1, type GenerationPayloadMinimal, type ModulePackage } from '../../shared/src';
import { getTransitionActionLabel, getTransitionReadiness } from './packageLifecycle';

type ModuleNode = {
  id: string;
  name: string;
  kind: 'composite' | 'leaf';
};

type Connection = {
  fromModuleId: string;
  toModuleId: string;
  signal: string;
};

type PackageSectionStatus = 'empty' | 'partial' | 'complete' | 'needs_review';
type SectionKey =
  | 'identity'
  | 'hierarchy'
  | 'interfaces'
  | 'purpose'
  | 'behavior'
  | 'constraints'
  | 'dependenciesAndInteractions'
  | 'decompositionStatus';

type DesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
};

type PersistedDesignState = {
  moduleList: ModuleNode[];
  selectedModuleId: string;
  connections: Connection[];
  packageContentByModuleId: Record<string, ModulePackage>;
  handedOffAtByModuleId: Record<string, string>;
};

type WorkspaceMode = 'design' | 'review' | 'handoff';

type SuggestionType = 'purpose_proposal' | 'behavior_summary' | 'ports_suggestion' | 'decomposition_suggestion';
type SuggestionStatus = 'pending' | 'accepted' | 'rejected';
type PortDraft = NonNullable<NonNullable<ModulePackage['interfaces']>['ports']>[number];

type SuggestionCard = {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  status: SuggestionStatus;
  draft: {
    summaryText?: string;
    ports?: PortDraft[];
    decompositionStatus?: NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'];
    decompositionRationale?: string;
  };
};

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

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyList(values: string[]): string {
  return values.join(', ');
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

function portsForDirection(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout'): string[] {
  return (modulePackage.interfaces?.ports ?? []).filter((port) => port.direction === direction).map((port) => port.name);
}

function replaceDirectionPorts(modulePackage: ModulePackage, direction: 'input' | 'output' | 'inout', names: string[]): ModulePackage {
  const existingPorts = modulePackage.interfaces?.ports ?? [];
  const untouched = existingPorts.filter((port) => port.direction !== direction);
  const nextDirectionPorts = names.map((name, index) => ({
    id: `${direction}_${index}`,
    name,
    direction,
    width: '1',
    description: ''
  }));

  return {
    ...modulePackage,
    interfaces: {
      ...modulePackage.interfaces,
      ports: [...untouched, ...nextDirectionPorts]
    }
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
        <section className="panel left-panel">
          <h2>AI Collaboration</h2>
          <p className="muted">Mock suggestions for selected module: <strong>{selectedModule?.name}</strong></p>
          <p className="suggestions-note">Suggestions are not committed until you click <strong>Accept</strong>.</p>
          <button type="button" onClick={regenerateSuggestionsForSelectedModule}>Regenerate mock suggestions</button>
          <div className="suggestions-list">
            {selectedSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="suggestion-card">
                <div className="suggestion-header-row">
                  <h3>{suggestion.title}</h3>
                  <span className={`suggestion-status suggestion-${suggestion.status}`}>{suggestion.status}</span>
                </div>
                <p className="muted">{suggestion.description}</p>

                {(suggestion.type === 'purpose_proposal' || suggestion.type === 'behavior_summary') && (
                  <label>
                    Suggested text (editable before accept)
                    <textarea
                      value={suggestion.draft.summaryText ?? ''}
                      onChange={(event) =>
                        updateSuggestion(suggestion.id, (current) => ({
                          ...current,
                          draft: { ...current.draft, summaryText: event.target.value },
                          status: current.status === 'accepted' ? 'pending' : current.status
                        }))
                      }
                      rows={3}
                    />
                  </label>
                )}

                {suggestion.type === 'ports_suggestion' && (
                  <div className="ports-suggestion-grid">
                    {(suggestion.draft.ports ?? []).map((port, index) => (
                      <div key={port.id} className="port-edit-row">
                        <input
                          aria-label={`Port ${index + 1} name`}
                          value={port.name}
                          onChange={(event) =>
                            updateSuggestion(suggestion.id, (current) => ({
                              ...current,
                              draft: {
                                ...current.draft,
                                ports: (current.draft.ports ?? []).map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, name: event.target.value } : item
                                )
                              },
                              status: current.status === 'accepted' ? 'pending' : current.status
                            }))
                          }
                          placeholder="name"
                        />
                        <select
                          aria-label={`Port ${index + 1} direction`}
                          value={port.direction}
                          onChange={(event) =>
                            updateSuggestion(suggestion.id, (current) => ({
                              ...current,
                              draft: {
                                ...current.draft,
                                ports: (current.draft.ports ?? []).map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, direction: event.target.value as PortDraft['direction'] } : item
                                )
                              },
                              status: current.status === 'accepted' ? 'pending' : current.status
                            }))
                          }
                        >
                          <option value="input">input</option>
                          <option value="output">output</option>
                          <option value="inout">inout</option>
                        </select>
                        <input
                          aria-label={`Port ${index + 1} width`}
                          value={port.width ?? ''}
                          onChange={(event) =>
                            updateSuggestion(suggestion.id, (current) => ({
                              ...current,
                              draft: {
                                ...current.draft,
                                ports: (current.draft.ports ?? []).map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, width: event.target.value } : item
                                )
                              },
                              status: current.status === 'accepted' ? 'pending' : current.status
                            }))
                          }
                          placeholder="width"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {suggestion.type === 'decomposition_suggestion' && (
                  <>
                    <label>
                      Suggested status
                      <select
                        value={suggestion.draft.decompositionStatus ?? 'under_decomposition'}
                        onChange={(event) =>
                          updateSuggestion(suggestion.id, (current) => ({
                            ...current,
                            draft: {
                              ...current.draft,
                              decompositionStatus: event.target.value as NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus']
                            },
                            status: current.status === 'accepted' ? 'pending' : current.status
                          }))
                        }
                      >
                        <option value="composite">composite</option>
                        <option value="under_decomposition">under_decomposition</option>
                        <option value="candidate_leaf">candidate_leaf</option>
                        <option value="approved_leaf">approved_leaf</option>
                      </select>
                    </label>
                    <label>
                      Rationale (editable before accept)
                      <textarea
                        value={suggestion.draft.decompositionRationale ?? ''}
                        onChange={(event) =>
                          updateSuggestion(suggestion.id, (current) => ({
                            ...current,
                            draft: { ...current.draft, decompositionRationale: event.target.value },
                            status: current.status === 'accepted' ? 'pending' : current.status
                          }))
                        }
                        rows={3}
                      />
                    </label>
                  </>
                )}

                <div className="suggestion-actions">
                  <button type="button" onClick={() => acceptSuggestion(suggestion)} disabled={suggestion.status === 'accepted'}>Accept</button>
                  <button type="button" onClick={() => rejectSuggestion(suggestion.id)} disabled={suggestion.status === 'rejected'}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel center-panel">
          <h2>Diagram Workspace</h2>
          <p className="muted">Basic interactions: create, select, and connect blocks.</p>
          <div className="inline-form">
            <input value={newModuleName} onChange={(event) => setNewModuleName(event.target.value)} placeholder="new block name" />
            <select value={newModuleKind} onChange={(event) => setNewModuleKind(event.target.value as ModuleNode['kind'])} aria-label="Block kind">
              <option value="leaf">leaf</option>
              <option value="composite">composite</option>
            </select>
            <button type="button" onClick={createModule}>Create block</button>
          </div>
          <ul className="module-list">
            {state.moduleList.map((moduleNode) => (
              <li key={moduleNode.id}>
                <button
                  type="button"
                  className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                  onClick={() => setState((current) => ({ ...current, selectedModuleId: moduleNode.id }))}
                >
                  <span>{moduleNode.name}</span>
                  <small>{moduleNode.kind}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="connection-builder">
            <strong>Rename selected block</strong>
            <div className="inline-form">
              <input
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                placeholder={selectedModule?.name ?? 'module name'}
              />
              <button type="button" onClick={renameSelectedModule}>Rename block</button>
            </div>
          </div>
          <div className="connection-builder">
            <strong>Connect blocks</strong>
            <div className="inline-form">
              <select value={connectionDraft.fromModuleId} onChange={(event) => setConnectionDraft((current) => ({ ...current, fromModuleId: event.target.value }))} aria-label="Connection source">
                {state.moduleList.map((moduleNode) => (
                  <option key={`from-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                ))}
              </select>
              <select value={connectionDraft.toModuleId} onChange={(event) => setConnectionDraft((current) => ({ ...current, toModuleId: event.target.value }))} aria-label="Connection target">
                {state.moduleList.map((moduleNode) => (
                  <option key={`to-${moduleNode.id}`} value={moduleNode.id}>{moduleNode.name}</option>
                ))}
              </select>
              <input value={connectionDraft.signal} onChange={(event) => setConnectionDraft((current) => ({ ...current, signal: event.target.value }))} placeholder="signal" />
              <button type="button" onClick={addConnection}>Connect</button>
            </div>
          </div>
        </section>

        <section className="panel right-panel">
          <h2>Module Package</h2>
          <p className="muted">Selected module: {selectedModule?.name} ({state.selectedModuleId})</p>
          <label>
            Workspace mode
            <select value={workspaceMode} onChange={(event) => setWorkspaceMode(event.target.value as WorkspaceMode)} aria-label="Workspace mode">
              <option value="design">design</option>
              <option value="review">review</option>
              <option value="handoff">handoff</option>
            </select>
          </label>

          <section className="lifecycle-card">
            <h3>Package lifecycle</h3>
            <p className="muted">Current state: <strong>{currentPackageContent.packageStatus}</strong></p>
            {transitionReadiness ? (
              <>
                <p className="muted">Next transition: {transitionReadiness.title}</p>
                {transitionReadiness.canTransition ? (
                  <p className="ready-message">Ready to transition.</p>
                ) : (
                  <div className="missing-list">
                    <strong>Missing before transition:</strong>
                    <ul>
                      {transitionReadiness.missingRequirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button type="button" onClick={moveToNextPackageState} disabled={!transitionReadiness.canTransition}>
                  {getTransitionActionLabel(transitionReadiness.to)}
                </button>
              </>
            ) : (
              <p className="ready-message">No further transitions in MVP flow.</p>
            )}
          </section>

          <ModulePackageSection title="Identity" status={currentSectionStatuses.identity}>
            <label>
              Name
              <input value={currentPackageContent.identity?.name ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, name: event.target.value } }))} placeholder="module name" />
            </label>
            <label>
              Description
              <textarea value={currentPackageContent.identity?.description ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, identity: { ...current.identity, description: event.target.value } }))} rows={2} placeholder="short identity description" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Hierarchy" status={currentSectionStatuses.hierarchy}>
            <label>
              Parent module id
              <input value={currentPackageContent.hierarchy?.parentModuleId ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, parentModuleId: event.target.value } }))} placeholder="root" />
            </label>
            <label>
              Child module ids (comma-separated)
              <input value={stringifyList(currentPackageContent.hierarchy?.childModuleIds ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, childModuleIds: parseList(event.target.value) } }))} placeholder="child_a, child_b" />
            </label>
            <label>
              Hierarchy path (comma-separated)
              <input value={stringifyList(currentPackageContent.hierarchy?.hierarchyPath ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, hierarchy: { ...current.hierarchy, hierarchyPath: parseList(event.target.value) } }))} placeholder="top_controller, module_name" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Interfaces" status={currentSectionStatuses.interfaces}>
            <label>
              Input ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'input'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'input', parseList(event.target.value)))} placeholder="in_a, in_b" />
            </label>
            <label>
              Output ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'output'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'output', parseList(event.target.value)))} placeholder="out_a, out_b" />
            </label>
            <label>
              Inout ports (comma-separated)
              <input value={stringifyList(portsForDirection(currentPackageContent, 'inout'))} onChange={(event) => updateCurrentPackage((current) => replaceDirectionPorts(current, 'inout', parseList(event.target.value)))} placeholder="io_bus" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Purpose" status={currentSectionStatuses.purpose}>
            <label>
              Purpose summary
              <textarea value={currentPackageContent.purpose?.summary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, purpose: { ...current.purpose, summary: event.target.value } }))} rows={3} placeholder="what does this module do?" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Behavior" status={currentSectionStatuses.behavior}>
            <label>
              Behavior summary
              <textarea value={currentPackageContent.behavior?.behaviorSummary ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorSummary: event.target.value } }))} rows={2} placeholder="high-level behavior" />
            </label>
            <label>
              Behavior rules (comma-separated)
              <input value={stringifyList(currentPackageContent.behavior?.behaviorRules ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, behaviorRules: parseList(event.target.value) } }))} placeholder="rule_a, rule_b" />
            </label>
            <label>
              Clock / reset notes
              <textarea value={currentPackageContent.behavior?.clockResetNotes ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, behavior: { ...current.behavior, clockResetNotes: event.target.value } }))} rows={2} placeholder="clock and reset behavior" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Constraints" status={currentSectionStatuses.constraints}>
            <label>
              Basic constraints (comma-separated)
              <input value={stringifyList(currentPackageContent.constraints?.basicConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, basicConstraints: parseList(event.target.value) } }))} placeholder="constraint_a, constraint_b" />
            </label>
            <label>
              Timing constraints (comma-separated)
              <input value={stringifyList(currentPackageContent.constraints?.timingConstraints ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, constraints: { ...current.constraints, timingConstraints: parseList(event.target.value) } }))} placeholder="setup < 2ns" />
            </label>
          </ModulePackageSection>

          <ModulePackageSection title="Dependencies and Interactions" status={currentSectionStatuses.dependenciesAndInteractions}>
            <label>
              Relevant dependencies (comma-separated)
              <input value={stringifyList(currentPackageContent.dependencies?.relevantDependencies ?? [])} onChange={(event) => updateCurrentPackage((current) => ({ ...current, dependencies: { ...current.dependencies, relevantDependencies: parseList(event.target.value) } }))} placeholder="system clock, upstream block" />
            </label>
            <div className="connection-list">
              <strong>Current interactions from connections</strong>
              {moduleConnections.length === 0 ? <p className="muted">No connections for this module.</p> : (
                <ul>
                  {moduleConnections.map((connection, index) => (
                    <li key={`${connection.fromModuleId}-${connection.toModuleId}-${connection.signal}-${index}`}>{connection.fromModuleId} → {connection.toModuleId} ({connection.signal})</li>
                  ))}
                </ul>
              )}
            </div>
          </ModulePackageSection>

          <ModulePackageSection title="Decomposition Status" status={currentSectionStatuses.decompositionStatus}>
            <label>
              Decomposition status
              <select
                value={currentPackageContent.decompositionStatus?.decompositionStatus ?? 'under_decomposition'}
                onChange={(event) =>
                  updateCurrentPackage((current) => ({
                    ...current,
                    decompositionStatus: {
                      decompositionStatus: event.target.value as NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus'],
                      decompositionRationale: current.decompositionStatus?.decompositionRationale ?? '',
                      stopReason: current.decompositionStatus?.stopReason,
                      stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy,
                      furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes
                    }
                  }))
                }
              >
                <option value="composite">composite</option>
                <option value="under_decomposition">under_decomposition</option>
                <option value="candidate_leaf">candidate_leaf</option>
                <option value="approved_leaf">approved_leaf</option>
              </select>
            </label>
            <label>
              Rationale
              <textarea value={currentPackageContent.decompositionStatus?.decompositionRationale ?? ''} onChange={(event) => updateCurrentPackage((current) => ({ ...current, decompositionStatus: { decompositionStatus: current.decompositionStatus?.decompositionStatus ?? 'under_decomposition', decompositionRationale: event.target.value, stopReason: current.decompositionStatus?.stopReason, stopRecommendedBy: current.decompositionStatus?.stopRecommendedBy, furtherDecompositionNotes: current.decompositionStatus?.furtherDecompositionNotes } }))} rows={2} placeholder="why this decomposition state?" />
            </label>
          </ModulePackageSection>

          {(workspaceMode === 'review' || workspaceMode === 'handoff') && (
            <section className="payload-preview">
              <strong>GenerationPayloadMinimal v1 preview (derived)</strong>
              {canShowPayloadPreview ? (
                <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
              ) : (
                <p className="muted">
                  Payload preview is available only for approved leaf-ready modules.
                  Ensure this module is a leaf, set decomposition to approved_leaf, and transition package status to leaf_ready.
                </p>
              )}
            </section>
          )}

          {workspaceMode === 'handoff' && (
            <section className="handoff-card">
              <h3>Handoff / Export</h3>
              <p className="muted">Approved leaf-ready modules</p>
              {approvedLeafReadyModules.length === 0 ? (
                <p className="muted">No modules are ready for handoff yet.</p>
              ) : (
                <ul className="handoff-list">
                  {approvedLeafReadyModules.map((moduleNode) => {
                    const handedOffAt = state.handedOffAtByModuleId[moduleNode.id];
                    return (
                      <li key={moduleNode.id}>
                        <button
                          type="button"
                          className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                          onClick={() => setState((current) => ({ ...current, selectedModuleId: moduleNode.id }))}
                        >
                          <span>
                            {moduleNode.name}
                            {handedOffAt ? <small className="handoff-indicator">handed_off</small> : null}
                          </span>
                          <small>{state.packageContentByModuleId[moduleNode.id]?.packageStatus}</small>
                        </button>
                        {handedOffAt ? <p className="muted">Handoff timestamp: {new Date(handedOffAt).toLocaleString()}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              <button type="button" onClick={markSelectedModuleAsHandedOff} disabled={!isSelectedModuleHandoffReady || Boolean(selectedModuleHandedOffAt)}>
                {selectedModuleHandedOffAt ? 'Already handed off' : 'Mark selected module as handed_off'}
              </button>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

type ModulePackageSectionProps = {
  title: string;
  status: PackageSectionStatus;
  children: ReactNode;
};

function ModulePackageSection({ title, status, children }: ModulePackageSectionProps): JSX.Element {
  return (
    <section className="module-package-section">
      <div className="section-header-row">
        <h3>{title}</h3>
        <StatusBadge label="status" status={status} />
      </div>
      <div>{children}</div>
    </section>
  );
}

type StatusBadgeProps = {
  label: string;
  status: PackageSectionStatus;
};

function StatusBadge({ label, status }: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-${status}`}>{label}: {status}</span>;
}


export default App;
