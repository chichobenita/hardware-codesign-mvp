import type { ModulePackage } from '../../shared/src';
import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import { DesignStoreProvider, useDesignStore } from './state/designStore';
import { exportProjectSnapshot, getProjectImportErrorMessage, importProjectSnapshot, triggerProjectDownload } from './state/designTransfer';
import {
  selectCanShowPayloadPreview,
  selectCurrentHierarchyModule,
  selectDesignHasValidationIssues,
  selectEligibleLeafReadyModules,
  selectGenerationPayloadSource,
  selectHierarchyBreadcrumbs,
  selectModuleIsValidForReviewOrHandoff,
  selectParentHierarchyModuleId,
  selectSectionStatuses,
  selectSelectedModule,
  selectSelectedModulePackage,
  selectTransitionReadiness,
  selectValidationIssues,
  selectValidationIssuesForModule,
  selectVisibleConnections,
  selectVisibleModules
} from './state/designSelectors';
import { sanitizeModuleIdSegment } from './state/reducerHelpers/seedState';
import type { AiChatMessage, ModuleNode, SuggestionCard, SuggestionType } from './types';

const AI_CHAT_HELP_MESSAGE = 'Ask for purpose, behavior, ports, or decomposition updates, or use commands like "create module packet_parser", "connect input_fifo to scheduler with fifo_valid", or "decompose into parser, arbiter".';

function parseDecompositionNames(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function createAiChatMessage(
  role: AiChatMessage['role'],
  text: string,
  tone: AiChatMessage['tone'] = 'status'
): AiChatMessage {
  const createdAt = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 8);

  return {
    id: `${role}-${createdAt}-${suffix}`,
    role,
    text,
    createdAt,
    tone
  };
}

function promptMatchesHelp(prompt: string): boolean {
  const lowered = prompt.toLowerCase();
  return lowered === 'help' || lowered.includes('what can you do') || lowered.includes('show commands');
}

function findSuggestionByType(suggestions: SuggestionCard[], type: SuggestionType): SuggestionCard | undefined {
  return suggestions.find((suggestion) => suggestion.type === type);
}

function resolveSuggestionType(prompt: string): SuggestionType | null {
  const lowered = prompt.toLowerCase();

  if (lowered.includes('purpose')) {
    return 'purpose_proposal';
  }
  if (lowered.includes('behavior')) {
    return 'behavior_summary';
  }
  if (lowered.includes('port') || lowered.includes('interface')) {
    return 'ports_suggestion';
  }
  if (lowered.includes('decomposition') || lowered.includes('approved leaf') || lowered.includes('candidate leaf')) {
    return 'decomposition_suggestion';
  }

  return null;
}

function parseCreateModuleCommand(prompt: string): { name: string; kind: ModuleNode['kind'] } | null {
  const match = prompt.match(/^(?:create|add)\s+(?:(leaf|composite)\s+)?(?:module|block)\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const name = match[2]?.trim();
  if (!name) {
    return null;
  }

  return {
    name,
    kind: match[1]?.toLowerCase() === 'composite' ? 'composite' : 'leaf'
  };
}

function parseConnectCommand(prompt: string): { fromToken: string; toToken: string; signal: string } | null {
  const match = prompt.match(/^connect\s+(.+?)\s+(?:to|->)\s+(.+?)(?:\s+(?:with|signal)\s+(.+))?$/i);
  if (!match) {
    return null;
  }

  return {
    fromToken: match[1]?.trim() ?? '',
    toToken: match[2]?.trim() ?? '',
    signal: match[3]?.trim() ?? ''
  };
}

function parseDecomposeCommand(prompt: string): { childNames: string[]; childKind: ModuleNode['kind'] } | null {
  const match = prompt.match(/^(?:decompose|split)(?:\s+(?:selected|current)\s+(?:module|block))?(?:\s+into)?\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const rawNames = match[1]?.trim() ?? '';
  const lowered = rawNames.toLowerCase();
  const childKind = lowered.includes('composite') ? 'composite' : 'leaf';
  const namesText = rawNames.replace(/\b(?:leaf|composite)\b/gi, '').trim();

  return {
    childNames: parseDecompositionNames(namesText),
    childKind
  };
}

function buildLookupKey(value: string): string {
  return sanitizeModuleIdSegment(value);
}

function findModuleByToken(moduleList: ModuleNode[], token: string): ModuleNode | undefined {
  const lookupKey = buildLookupKey(token);
  return moduleList.find((moduleNode) => (
    buildLookupKey(moduleNode.id) === lookupKey || buildLookupKey(moduleNode.name) === lookupKey
  ));
}

function getPromptTextAfterColon(prompt: string): string {
  const separatorIndex = prompt.indexOf(':');
  return separatorIndex === -1 ? '' : prompt.slice(separatorIndex + 1).trim();
}

function customizeSuggestionFromPrompt(prompt: string, suggestion: SuggestionCard): SuggestionCard {
  if (suggestion.type === 'purpose_proposal' || suggestion.type === 'behavior_summary') {
    const summaryText = getPromptTextAfterColon(prompt);
    if (!summaryText) {
      return suggestion;
    }

    return {
      ...suggestion,
      status: 'pending',
      draft: {
        ...suggestion.draft,
        summaryText
      }
    };
  }

  if (suggestion.type !== 'decomposition_suggestion') {
    return suggestion;
  }

  const promptText = getPromptTextAfterColon(prompt);
  const statusSource = (promptText || prompt).toLowerCase();
  const nextStatus = statusSource.includes('approved leaf') || statusSource.includes('approved_leaf')
    ? 'approved_leaf'
    : statusSource.includes('candidate leaf') || statusSource.includes('candidate_leaf')
      ? 'candidate_leaf'
      : statusSource.includes('under decomposition') || statusSource.includes('under_decomposition')
        ? 'under_decomposition'
        : statusSource.includes('composite')
          ? 'composite'
          : suggestion.draft.decompositionStatus ?? 'under_decomposition';
  const rationaleFromBecause = promptText.split(/because/i).slice(1).join('because').trim();
  const nextRationale = rationaleFromBecause || (suggestion.draft.decompositionRationale ?? '');

  if (
    nextStatus === suggestion.draft.decompositionStatus
    && nextRationale === (suggestion.draft.decompositionRationale ?? '')
  ) {
    return suggestion;
  }

  return {
    ...suggestion,
    status: 'pending',
    draft: {
      ...suggestion.draft,
      decompositionStatus: nextStatus,
      decompositionRationale: nextRationale
    }
  };
}

function formatSuggestionTypeLabel(type: SuggestionType): string {
  if (type === 'purpose_proposal') {
    return 'purpose';
  }
  if (type === 'behavior_summary') {
    return 'behavior';
  }
  if (type === 'ports_suggestion') {
    return 'ports';
  }

  return 'decomposition';
}

function formatPortsInline(suggestion: SuggestionCard): string {
  const ports = suggestion.draft.ports ?? [];
  if (ports.length === 0) {
    return 'no ports';
  }

  return ports
    .map((port) => `${port.name} (${port.direction}${port.width ? ` ${port.width}` : ''})`)
    .join(', ');
}

function buildAppliedSuggestionMessage(moduleName: string, suggestion: SuggestionCard): string {
  if (suggestion.type === 'purpose_proposal') {
    return `Updated purpose for ${moduleName}: ${suggestion.draft.summaryText ?? ''}`.trim();
  }

  if (suggestion.type === 'behavior_summary') {
    return `Updated behavior for ${moduleName}: ${suggestion.draft.summaryText ?? ''}`.trim();
  }

  if (suggestion.type === 'ports_suggestion') {
    return `Updated interface ports for ${moduleName}: ${formatPortsInline(suggestion)}.`;
  }

  return `Updated decomposition for ${moduleName}: ${suggestion.draft.decompositionStatus ?? 'under_decomposition'}${suggestion.draft.decompositionRationale ? ` because ${suggestion.draft.decompositionRationale}` : ''}.`;
}

function buildRejectedSuggestionMessage(moduleName: string, suggestionType: SuggestionType): string {
  const label = suggestionType === 'purpose_proposal'
    ? 'purpose'
    : suggestionType === 'behavior_summary'
      ? 'behavior'
      : suggestionType === 'ports_suggestion'
        ? 'ports'
        : 'decomposition';

  return `Skipped the ${label} draft for ${moduleName}.`;
}

export function AppWorkspace(): JSX.Element {
  const { state, dispatch } = useDesignStore();

  const selectedModule = selectSelectedModule(state);
  const currentHierarchyModule = selectCurrentHierarchyModule(state);
  const currentHierarchyBreadcrumbs = selectHierarchyBreadcrumbs(state);
  const parentHierarchyModuleId = selectParentHierarchyModuleId(state);
  const visibleModules = selectVisibleModules(state);
  const visibleConnections = selectVisibleConnections(state);
  const currentPackageContent = selectSelectedModulePackage(state);
  const currentSectionStatuses = selectSectionStatuses(currentPackageContent);
  const moduleConnections = state.connections.filter((connection) => connection.fromModuleId === state.selectedModuleId || connection.toModuleId === state.selectedModuleId);
  const generatedPayload = selectGenerationPayloadSource(currentPackageContent);
  const transitionReadiness = selectTransitionReadiness(currentPackageContent);
  const approvedLeafReadyModules = selectEligibleLeafReadyModules(state);
  const canShowPayloadPreview = selectCanShowPayloadPreview(state.ui.workspaceMode, selectedModule, currentPackageContent);
  const validationIssues = selectValidationIssues(state);
  const moduleValidationIssues = selectValidationIssuesForModule(state, state.selectedModuleId);
  const designHasValidationIssues = selectDesignHasValidationIssues(state);
  const isSelectedModuleValidForReviewOrHandoff = selectModuleIsValidForReviewOrHandoff(state, state.selectedModuleId);
  const selectedSuggestions = state.suggestionsByModuleId[state.selectedModuleId] ?? [];

  const updateCurrentPackage = (updater: (current: ModulePackage) => ModulePackage) => {
    dispatch({ type: 'update_selected_module_package', payload: { updater } });
  };

  const regenerateSuggestionsForSelectedModule = () => {
    if (!selectedModule) {
      return;
    }

    dispatch({
      type: 'set_suggestions_for_module',
      payload: {
        moduleId: selectedModule.id,
        suggestions: []
      }
    });
    dispatch({ type: 'select_module', payload: { moduleId: selectedModule.id } });
  };

  const updateSuggestion = (suggestionId: string, updater: (current: SuggestionCard) => SuggestionCard) => {
    dispatch({ type: 'update_suggestion', payload: { moduleId: state.selectedModuleId, suggestionId, updater } });
  };

  const rejectSuggestion = (suggestionId: string) => {
    dispatch({ type: 'reject_suggestion', payload: { moduleId: state.selectedModuleId, suggestionId } });
  };

  const acceptSuggestion = (suggestion: SuggestionCard) => {
    dispatch({ type: 'apply_accepted_suggestion', payload: { moduleId: state.selectedModuleId, suggestion } });
  };

  const appendAiChatMessages = (messages: AiChatMessage[]) => {
    dispatch({ type: 'append_ai_chat_messages', payload: { messages } });
  };

  const setAiComposerText = (value: string) => {
    dispatch({ type: 'set_ai_composer_text', payload: { value } });
  };

  const submitAiPrompt = () => {
    const prompt = state.ui.aiComposerText.trim();
    if (!prompt) {
      return;
    }

    const selectedModuleName = selectedModule?.name ?? state.selectedModuleId;
    appendAiChatMessages([createAiChatMessage('user', prompt)]);
    setAiComposerText('');

    if (!selectedModule) {
      appendAiChatMessages([createAiChatMessage('assistant', 'Select a module before sending AI commands.', 'guide')]);
      return;
    }

    if (promptMatchesHelp(prompt)) {
      appendAiChatMessages([createAiChatMessage('assistant', AI_CHAT_HELP_MESSAGE, 'guide')]);
      return;
    }

    const createModuleCommand = parseCreateModuleCommand(prompt);
    if (createModuleCommand) {
      dispatch({
        type: 'create_module',
        payload: {
          name: createModuleCommand.name,
          kind: createModuleCommand.kind,
          parentModuleId: state.ui.currentHierarchyModuleId
        }
      });

      appendAiChatMessages([
        createAiChatMessage(
          'assistant',
          `Created ${createModuleCommand.kind} module ${createModuleCommand.name} in ${currentHierarchyModule?.name ?? 'the current scope'}.`
        )
      ]);
      return;
    }

    const connectCommand = parseConnectCommand(prompt);
    if (connectCommand) {
      const fromModule = findModuleByToken(state.moduleList, connectCommand.fromToken);
      const toModule = findModuleByToken(state.moduleList, connectCommand.toToken);

      if (!fromModule || !toModule) {
        appendAiChatMessages([
          createAiChatMessage('assistant', 'I could not resolve both modules for that connection. Use a visible name or module id.', 'guide')
        ]);
        return;
      }
      if (!connectCommand.signal) {
        appendAiChatMessages([
          createAiChatMessage('assistant', 'Include a signal name, for example: connect input_fifo to scheduler with fifo_valid.', 'guide')
        ]);
        return;
      }

      dispatch({
        type: 'connect_modules',
        payload: {
          connection: {
            fromModuleId: fromModule.id,
            toModuleId: toModule.id,
            signal: connectCommand.signal
          }
        }
      });

      appendAiChatMessages([
        createAiChatMessage('assistant', `Connected ${fromModule.name} to ${toModule.name} with signal ${connectCommand.signal}.`)
      ]);
      return;
    }

    const decomposeCommand = parseDecomposeCommand(prompt);
    if (decomposeCommand) {
      if (decomposeCommand.childNames.length === 0) {
        appendAiChatMessages([
          createAiChatMessage('assistant', 'List at least one child name after "decompose into".', 'guide')
        ]);
        return;
      }

      dispatch({
        type: 'decompose_selected_module',
        payload: {
          childNames: decomposeCommand.childNames,
          childKind: decomposeCommand.childKind
        }
      });

      appendAiChatMessages([
        createAiChatMessage('assistant', `Decomposed ${selectedModuleName} into ${decomposeCommand.childNames.join(', ')}.`)
      ]);
      return;
    }

    if (/(?:refresh|regenerate).*(?:draft|suggestion)|(?:draft|suggestion).*(?:refresh|regenerate)/i.test(prompt)) {
      regenerateSuggestionsForSelectedModule();
      appendAiChatMessages([
        createAiChatMessage('assistant', `Refreshed the draft suggestions for ${selectedModuleName}.`)
      ]);
      return;
    }

    const suggestionType = resolveSuggestionType(prompt);
    if (suggestionType) {
      const suggestion = findSuggestionByType(selectedSuggestions, suggestionType);
      if (!suggestion) {
        appendAiChatMessages([
          createAiChatMessage('assistant', `No ${formatSuggestionTypeLabel(suggestionType)} draft is available right now. Try "refresh drafts".`, 'guide')
        ]);
        return;
      }

      if (/^(?:reject|ignore|dismiss)\b/i.test(prompt)) {
        rejectSuggestion(suggestion.id);
        appendAiChatMessages([
          createAiChatMessage('assistant', buildRejectedSuggestionMessage(selectedModuleName, suggestionType))
        ]);
        return;
      }

      const nextSuggestion = customizeSuggestionFromPrompt(prompt, suggestion);
      updateSuggestion(suggestion.id, () => nextSuggestion);
      acceptSuggestion(nextSuggestion);
      appendAiChatMessages([
        createAiChatMessage('assistant', buildAppliedSuggestionMessage(selectedModuleName, nextSuggestion))
      ]);
      return;
    }

    appendAiChatMessages([
      createAiChatMessage('assistant', AI_CHAT_HELP_MESSAGE, 'guide')
    ]);
  };

  const moveToNextPackageState = () => {
    if (!transitionReadiness || !transitionReadiness.canTransition) {
      return;
    }

    dispatch({ type: 'move_selected_package_state_forward', payload: { to: transitionReadiness.to } });
  };

  const createModule = () => {
    dispatch({
      type: 'create_module',
      payload: {
        name: state.ui.newModuleName,
        kind: state.ui.newModuleKind,
        parentModuleId: state.ui.currentHierarchyModuleId
      }
    });
  };

  const renameSelectedModule = () => {
    dispatch({ type: 'rename_module', payload: { moduleId: state.selectedModuleId, name: state.ui.renameDraft } });
  };

  const addConnection = () => {
    const nextConnection = { ...state.ui.connectionDraft, signal: state.ui.connectionDraft.signal.trim() };
    if (!nextConnection.fromModuleId || !nextConnection.toModuleId || !nextConnection.signal) {
      return;
    }

    dispatch({ type: 'connect_modules', payload: { connection: nextConnection } });
  };

  const markSelectedModuleAsHandedOff = () => {
    dispatch({ type: 'mark_selected_module_handed_off', payload: {} });
  };

  const exportCurrentProject = () => {
    const exported = exportProjectSnapshot(state);
    triggerProjectDownload(exported.filename, exported.json);
    dispatch({ type: 'set_project_import_error', payload: { message: null } });
  };

  const importProjectFromFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const raw = await file.text();
    const imported = importProjectSnapshot(raw);
    if (!imported.ok) {
      dispatch({ type: 'set_project_import_error', payload: { message: getProjectImportErrorMessage(imported.reason) } });
      return;
    }
    if (!imported.state) {
      dispatch({ type: 'set_project_import_error', payload: { message: getProjectImportErrorMessage('invalid_restore_state') } });
      return;
    }

    dispatch({ type: 'replace_design_state', payload: { state: imported.state } });
    dispatch({ type: 'set_project_import_error', payload: { message: null } });
  };

  const decomposeSelectedModule = () => {
    const childNames = parseDecompositionNames(state.ui.decompositionDraft.namesText);
    if (childNames.length === 0) {
      return;
    }

    dispatch({
      type: 'decompose_selected_module',
      payload: {
        childNames,
        childKind: state.ui.decompositionDraft.childKind
      }
    });
  };

  const enterSelectedComposite = () => {
    if (selectedModule?.kind !== 'composite') {
      return;
    }

    dispatch({ type: 'enter_hierarchy_view', payload: { moduleId: selectedModule.id } });
  };

  const selectedModuleHandedOffAt = state.handedOffAtByModuleId[state.selectedModuleId];
  const isSelectedModuleHandoffReady = approvedLeafReadyModules.some((moduleNode) => moduleNode.id === state.selectedModuleId)
    && isSelectedModuleValidForReviewOrHandoff;

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP - Main Workspace</header>
      <main className="workspace-grid">
        <AISuggestionsPanel
          selectedModule={selectedModule}
          selectedSuggestions={selectedSuggestions}
          aiChatHistory={state.aiChatHistory}
          aiComposerText={state.ui.aiComposerText}
          setAiComposerText={setAiComposerText}
          submitAiPrompt={submitAiPrompt}
        />

        <DiagramWorkspace
          state={state}
          visibleModules={visibleModules}
          visibleConnections={visibleConnections}
          currentHierarchyModule={currentHierarchyModule}
          currentHierarchyBreadcrumbs={currentHierarchyBreadcrumbs}
          parentHierarchyModuleId={parentHierarchyModuleId}
          setHierarchyView={(moduleId) => dispatch({ type: 'set_hierarchy_view', payload: { moduleId } })}
          navigateToParentHierarchy={() => dispatch({ type: 'navigate_to_parent_hierarchy', payload: {} })}
          setNewModuleName={(value) => dispatch({ type: 'set_new_module_name', payload: { value } })}
          setNewModuleKind={(value) => dispatch({ type: 'set_new_module_kind', payload: { value } })}
          createModule={createModule}
          selectModule={(moduleId) => dispatch({ type: 'select_module', payload: { moduleId } })}
          setRenameDraft={(value) => dispatch({ type: 'set_rename_draft', payload: { value } })}
          selectedModule={selectedModule}
          renameSelectedModule={renameSelectedModule}
          enterSelectedComposite={enterSelectedComposite}
          setConnectionDraft={(value) => dispatch({ type: 'set_connection_draft', payload: { value } })}
          addConnection={addConnection}
        />

        <ModulePackagePanel
          selectedModule={selectedModule}
          state={state}
          setWorkspaceMode={(mode) => dispatch({ type: 'set_workspace_mode', payload: { mode } })}
          currentPackageContent={currentPackageContent}
          transitionReadiness={transitionReadiness}
          moveToNextPackageState={moveToNextPackageState}
          currentSectionStatuses={currentSectionStatuses}
          updateCurrentPackage={updateCurrentPackage}
          moduleConnections={moduleConnections}
          canShowPayloadPreview={canShowPayloadPreview}
          generatedPayload={generatedPayload}
          approvedLeafReadyModules={approvedLeafReadyModules}
          selectModule={(moduleId) => dispatch({ type: 'select_module', payload: { moduleId } })}
          markSelectedModuleAsHandedOff={markSelectedModuleAsHandedOff}
          exportCurrentProject={exportCurrentProject}
          importProjectFromFile={importProjectFromFile}
          isSelectedModuleHandoffReady={isSelectedModuleHandoffReady}
          selectedModuleHandedOffAt={selectedModuleHandedOffAt}
          moduleValidationIssues={moduleValidationIssues}
          designHasValidationIssues={designHasValidationIssues || validationIssues.length > 0}
          isSelectedModuleValidForReviewOrHandoff={isSelectedModuleValidForReviewOrHandoff}
          currentHierarchyModule={currentHierarchyModule}
          decompositionDraftNamesText={state.ui.decompositionDraft.namesText}
          decompositionDraftChildKind={state.ui.decompositionDraft.childKind}
          setDecompositionNamesText={(value) => dispatch({ type: 'set_decomposition_names_text', payload: { value } })}
          setDecompositionChildKind={(value) => dispatch({ type: 'set_decomposition_child_kind', payload: { value } })}
          decomposeSelectedModule={decomposeSelectedModule}
        />
      </main>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <DesignStoreProvider>
      <AppWorkspace />
    </DesignStoreProvider>
  );
}

export default App;
