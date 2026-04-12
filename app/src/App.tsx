import type { AiProposal } from './ai/proposals/proposalTypes';
import { useAppWorkspace } from './application/useAppWorkspace';
import { AISuggestionsPanel } from './components/AISuggestionsPanel';
import { DiagramWorkspace } from './components/DiagramWorkspace';
import { ModulePackagePanel } from './components/ModulePackagePanel';
import { DesignStoreProvider, useDesignStore } from './state/designStore';
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

function toProposalKind(type: SuggestionType): AiProposal['proposedChange']['kind'] {
  if (type === 'purpose_proposal') {
    return 'purpose_update';
  }
  if (type === 'behavior_summary') {
    return 'behavior_update';
  }
  if (type === 'ports_suggestion') {
    return 'ports_update';
  }
  return 'decomposition_update';
}

function toSuggestionStatus(status: AiProposal['status']): SuggestionCard['status'] {
  if (status === 'applied') {
    return 'accepted';
  }
  if (status === 'rejected') {
    return 'rejected';
  }
  return 'pending';
}

function mapProposalToSuggestionCard(proposal: AiProposal): SuggestionCard {
  const change = proposal.proposedChange;

  if (change.kind === 'purpose_update') {
    return {
      id: proposal.proposalId,
      type: 'purpose_proposal',
      title: 'Purpose proposal',
      description: proposal.rationale,
      status: toSuggestionStatus(proposal.status),
      draft: {
        summaryText: change.purposeSummary
      }
    };
  }

  if (change.kind === 'behavior_update') {
    return {
      id: proposal.proposalId,
      type: 'behavior_summary',
      title: 'Behavior summary',
      description: proposal.rationale,
      status: toSuggestionStatus(proposal.status),
      draft: {
        summaryText: change.behaviorSummary
      }
    };
  }

  if (change.kind === 'ports_update') {
    return {
      id: proposal.proposalId,
      type: 'ports_suggestion',
      title: 'Ports proposal',
      description: proposal.rationale,
      status: toSuggestionStatus(proposal.status),
      draft: {
        ports: change.ports
      }
    };
  }

  return {
    id: proposal.proposalId,
    type: 'decomposition_suggestion',
    title: 'Decomposition proposal',
    description: proposal.rationale,
    status: toSuggestionStatus(proposal.status),
    draft: {
      decompositionStatus: change.decompositionStatus,
      decompositionRationale: change.decompositionRationale
    }
  };
}

function findProposalByType(proposals: AiProposal[], type: SuggestionType): AiProposal | undefined {
  const proposalKind = toProposalKind(type);
  return proposals.find((proposal) => proposal.proposedChange.kind === proposalKind);
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

function customizeProposalFromPrompt(prompt: string, proposal: AiProposal): AiProposal {
  const promptText = getPromptTextAfterColon(prompt);
  const change = proposal.proposedChange;

  if (change.kind === 'purpose_update') {
    if (!promptText) {
      return proposal;
    }

    return {
      ...proposal,
      status: 'proposed',
      proposedChange: {
        ...change,
        purposeSummary: promptText
      }
    };
  }

  if (change.kind === 'behavior_update') {
    if (!promptText) {
      return proposal;
    }

    return {
      ...proposal,
      status: 'proposed',
      proposedChange: {
        ...change,
        behaviorSummary: promptText
      }
    };
  }

  if (change.kind !== 'decomposition_update') {
    return proposal;
  }

  const statusSource = (promptText || prompt).toLowerCase();
  const nextStatus = statusSource.includes('approved leaf') || statusSource.includes('approved_leaf')
    ? 'approved_leaf'
    : statusSource.includes('candidate leaf') || statusSource.includes('candidate_leaf')
      ? 'candidate_leaf'
      : statusSource.includes('under decomposition') || statusSource.includes('under_decomposition')
        ? 'under_decomposition'
        : statusSource.includes('composite')
          ? 'composite'
          : change.decompositionStatus;
  const rationaleFromBecause = promptText.split(/because/i).slice(1).join('because').trim();
  const nextRationale = rationaleFromBecause || change.decompositionRationale;

  if (nextStatus === change.decompositionStatus && nextRationale === change.decompositionRationale) {
    return proposal;
  }

  return {
    ...proposal,
    status: 'proposed',
    proposedChange: {
      ...change,
      decompositionStatus: nextStatus,
      decompositionRationale: nextRationale
    }
  };
}

function formatPortsInline(proposal: AiProposal): string {
  if (proposal.proposedChange.kind !== 'ports_update') {
    return 'no ports';
  }

  if (proposal.proposedChange.ports.length === 0) {
    return 'no ports';
  }

  return proposal.proposedChange.ports
    .map((port) => `${port.name} (${port.direction}${port.width ? ` ${port.width}` : ''})`)
    .join(', ');
}

function buildAppliedProposalMessage(moduleName: string, proposal: AiProposal): string {
  const change = proposal.proposedChange;

  if (change.kind === 'purpose_update') {
    return `Updated purpose for ${moduleName}: ${change.purposeSummary}`.trim();
  }

  if (change.kind === 'behavior_update') {
    return `Updated behavior for ${moduleName}: ${change.behaviorSummary}`.trim();
  }

  if (change.kind === 'ports_update') {
    return `Updated interface ports for ${moduleName}: ${formatPortsInline(proposal)}.`;
  }

  return `Updated decomposition for ${moduleName}: ${change.decompositionStatus}${change.decompositionRationale ? ` because ${change.decompositionRationale}` : ''}.`;
}

function buildRejectedProposalMessage(moduleName: string, suggestionType: SuggestionType): string {
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
  const { dispatch } = useDesignStore();
  const { state, viewModel, actions } = useAppWorkspace();
  const selectedSuggestions = viewModel.selectedProposals.map(mapProposalToSuggestionCard);

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

    const selectedModuleName = viewModel.selectedModule?.name ?? state.selectedModuleId;
    appendAiChatMessages([createAiChatMessage('user', prompt)]);
    setAiComposerText('');

    if (!viewModel.selectedModule) {
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
          `Created ${createModuleCommand.kind} module ${createModuleCommand.name} in ${viewModel.currentHierarchyModule?.name ?? 'the current scope'}.`
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

    if (/(?:refresh|regenerate).*(?:draft|suggestion|proposal)|(?:draft|suggestion|proposal).*(?:refresh|regenerate)/i.test(prompt)) {
      actions.regenerateProposalsForSelectedModule();
      appendAiChatMessages([
        createAiChatMessage('assistant', `Refreshed the draft suggestions for ${selectedModuleName}.`)
      ]);
      return;
    }

    const suggestionType = resolveSuggestionType(prompt);
    if (suggestionType) {
      const proposal = findProposalByType(viewModel.selectedProposals, suggestionType);
      if (!proposal) {
        appendAiChatMessages([
          createAiChatMessage('assistant', `No ${suggestionType === 'ports_suggestion' ? 'ports' : suggestionType === 'behavior_summary' ? 'behavior' : suggestionType === 'purpose_proposal' ? 'purpose' : 'decomposition'} draft is available right now. Try "refresh drafts".`, 'guide')
        ]);
        return;
      }

      if (/^(?:reject|ignore|dismiss)\b/i.test(prompt)) {
        actions.rejectProposal(proposal.proposalId);
        appendAiChatMessages([
          createAiChatMessage('assistant', buildRejectedProposalMessage(selectedModuleName, suggestionType))
        ]);
        return;
      }

      const nextProposal = customizeProposalFromPrompt(prompt, proposal);
      actions.updateProposal(proposal.proposalId, () => nextProposal);
      actions.applyProposal(nextProposal);
      appendAiChatMessages([
        createAiChatMessage('assistant', buildAppliedProposalMessage(selectedModuleName, nextProposal))
      ]);
      return;
    }

    appendAiChatMessages([
      createAiChatMessage('assistant', AI_CHAT_HELP_MESSAGE, 'guide')
    ]);
  };

  return (
    <div className="app-shell">
      <header className="app-header">Hardware Co-Design MVP - Main Workspace</header>
      <main className="workspace-grid">
        <AISuggestionsPanel
          selectedModule={viewModel.selectedModule}
          selectedSuggestions={selectedSuggestions}
          aiChatHistory={state.aiChatHistory}
          aiComposerText={state.ui.aiComposerText}
          setAiComposerText={setAiComposerText}
          submitAiPrompt={submitAiPrompt}
        />

        <DiagramWorkspace
          state={state}
          visibleModules={viewModel.visibleModules}
          visibleConnections={viewModel.visibleConnections}
          currentHierarchyModule={viewModel.currentHierarchyModule}
          currentHierarchyBreadcrumbs={viewModel.currentHierarchyBreadcrumbs}
          parentHierarchyModuleId={viewModel.parentHierarchyModuleId}
          diagramViewportMode={state.ui.diagramViewportMode}
          setHierarchyView={actions.setHierarchyView}
          setDiagramViewportMode={actions.setDiagramViewportMode}
          toggleEdgeBundle={actions.toggleEdgeBundle}
          collapseAllEdgeBundles={actions.collapseAllEdgeBundles}
          navigateToParentHierarchy={actions.navigateToParentHierarchy}
          setNewModuleName={actions.setNewModuleName}
          setNewModuleKind={actions.setNewModuleKind}
          createModule={actions.createModule}
          selectModule={actions.selectModule}
          setRenameDraft={actions.setRenameDraft}
          selectedModule={viewModel.selectedModule}
          renameSelectedModule={actions.renameSelectedModule}
          enterSelectedComposite={actions.enterSelectedComposite}
          setConnectionDraft={actions.setConnectionDraft}
          addConnection={actions.addConnection}
        />

        <ModulePackagePanel
          selectedModule={viewModel.selectedModule}
          state={state}
          setWorkspaceMode={actions.setWorkspaceMode}
          handoffProviders={viewModel.handoffProviders}
          selectedProviderId={state.ui.selectedProviderId}
          setSelectedProvider={actions.setSelectedProvider}
          currentPackageContent={viewModel.currentPackageContent}
          transitionReadiness={viewModel.transitionReadiness}
          moveToNextPackageState={actions.moveToNextPackageState}
          currentSectionStatuses={viewModel.currentSectionStatuses}
          updateCurrentPackage={actions.updateCurrentPackage}
          moduleConnections={viewModel.moduleConnections}
          canShowPayloadPreview={viewModel.canShowPayloadPreview}
          generatedPayload={viewModel.generatedPayload}
          generatedPrompt={viewModel.generatedPrompt}
          handoffArtifacts={viewModel.handoffArtifacts}
          latestHandoffArtifact={viewModel.latestHandoffArtifact}
          copyGeneratedPrompt={actions.copyGeneratedPrompt}
          exportGeneratedPrompt={actions.exportGeneratedPrompt}
          exportLatestHandoffArtifact={actions.exportLatestHandoffArtifact}
          approvedLeafReadyModules={viewModel.approvedLeafReadyModules}
          currentProviderJob={viewModel.currentProviderJob}
          selectModule={actions.selectModule}
          markSelectedModuleAsHandedOff={actions.markSelectedModuleAsHandedOff}
          exportCurrentProject={actions.exportCurrentProject}
          importProjectFromFile={actions.importProjectFromFile}
          isSelectedModuleHandoffReady={viewModel.isSelectedModuleHandoffReady}
          hasCurrentSelectedArtifact={viewModel.hasCurrentSelectedArtifact}
          moduleValidationIssues={viewModel.moduleValidationIssues}
          designHasValidationIssues={viewModel.designHasValidationIssues}
          isSelectedModuleValidForReviewOrHandoff={viewModel.isSelectedModuleValidForReviewOrHandoff}
          currentHierarchyModule={viewModel.currentHierarchyModule}
          decompositionDraftNamesText={state.ui.decompositionDraft.namesText}
          decompositionDraftChildKind={state.ui.decompositionDraft.childKind}
          setDecompositionNamesText={actions.setDecompositionNamesText}
          setDecompositionChildKind={actions.setDecompositionChildKind}
          decomposeSelectedModule={actions.decomposeSelectedModule}
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
