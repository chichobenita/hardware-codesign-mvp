import type { AiChatMessage, ModuleNode, SuggestionCard } from '../types';

type AISuggestionsPanelProps = {
  selectedModule?: ModuleNode;
  selectedSuggestions: SuggestionCard[];
  aiChatHistory: AiChatMessage[];
  aiComposerText: string;
  setAiComposerText: (value: string) => void;
  submitAiPrompt: () => void;
};

function formatPortsSummary(suggestion: SuggestionCard): string {
  const ports = suggestion.draft.ports ?? [];
  if (ports.length === 0) {
    return 'no ports proposed yet';
  }

  return ports
    .map((port) => `${port.name} (${port.direction}${port.width ? ` ${port.width}` : ''})`)
    .join(', ');
}

function buildCurrentContextMessage(selectedModule: ModuleNode | undefined, selectedSuggestions: SuggestionCard[]): string {
  if (!selectedModule) {
    return 'Select a module to start the chat-first AI workflow.';
  }

  const pendingSuggestions = selectedSuggestions.filter((suggestion) => suggestion.status === 'pending');
  const intro = `Working on ${selectedModule.name}. Ask for a direct update and I will apply it in place.`;

  if (pendingSuggestions.length === 0) {
    return `${intro}\nNo pending drafts right now. Say "refresh drafts" for another pass.`;
  }

  const purposeSuggestion = pendingSuggestions.find((suggestion) => suggestion.type === 'purpose_proposal');
  const behaviorSuggestion = pendingSuggestions.find((suggestion) => suggestion.type === 'behavior_summary');
  const portsSuggestion = pendingSuggestions.find((suggestion) => suggestion.type === 'ports_suggestion');
  const decompositionSuggestion = pendingSuggestions.find((suggestion) => suggestion.type === 'decomposition_suggestion');

  return [
    intro,
    'Draft updates ready:',
    purposeSuggestion ? `Purpose: ${purposeSuggestion.draft.summaryText ?? 'pending'}` : null,
    behaviorSuggestion ? `Behavior: ${behaviorSuggestion.draft.summaryText ?? 'pending'}` : null,
    portsSuggestion ? `Ports: ${formatPortsSummary(portsSuggestion)}` : null,
    decompositionSuggestion
      ? `Decomposition: ${decompositionSuggestion.draft.decompositionStatus ?? 'under_decomposition'} - ${decompositionSuggestion.draft.decompositionRationale ?? ''}`.trim()
      : null
  ].filter(Boolean).join('\n');
}

function messageClassName(message: AiChatMessage): string {
  return [
    'ai-chat-message',
    message.role === 'user' ? 'ai-chat-message-user' : 'ai-chat-message-assistant',
    message.tone ? `ai-chat-message-${message.tone}` : ''
  ].filter(Boolean).join(' ');
}

export function AISuggestionsPanel({
  selectedModule,
  selectedSuggestions,
  aiChatHistory,
  aiComposerText,
  setAiComposerText,
  submitAiPrompt
}: AISuggestionsPanelProps): JSX.Element {
  const currentContextMessage = buildCurrentContextMessage(selectedModule, selectedSuggestions);

  return (
    <section className="panel left-panel ai-chat-panel">
      <div className="ai-chat-header">
        <h2>AI Collaboration</h2>
        <p className="muted">Selected module: <strong>{selectedModule?.name ?? 'none'}</strong></p>
      </div>

      <div className="ai-chat-transcript" role="log" aria-label="AI chat transcript">
        {aiChatHistory.map((message) => (
          <article key={message.id} className={messageClassName(message)}>
            <span className="ai-chat-speaker">{message.role === 'user' ? 'You' : 'AI'}</span>
            <p>{message.text}</p>
          </article>
        ))}

        <article className="ai-chat-message ai-chat-message-assistant ai-chat-message-guide">
          <span className="ai-chat-speaker">AI</span>
          <p>{currentContextMessage}</p>
        </article>
      </div>

      <form
        className="ai-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submitAiPrompt();
        }}
      >
        <label className="ai-chat-input-label" htmlFor="ai-chat-input">Design chat</label>
        <input
          id="ai-chat-input"
          aria-label="Design chat"
          value={aiComposerText}
          onChange={(event) => setAiComposerText(event.target.value)}
          placeholder='Try "purpose: ...", "apply ports", "create module parser", or "connect input_fifo to scheduler with fifo_valid".'
          disabled={!selectedModule}
        />
        <button type="submit" disabled={!selectedModule || aiComposerText.trim().length === 0}>Send</button>
      </form>
    </section>
  );
}
