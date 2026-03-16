import type { ModulePackage } from '../../../shared/src';
import type { ModuleNode, PortDraft, SuggestionCard } from '../types';

type AISuggestionsPanelProps = {
  selectedModule?: ModuleNode;
  regenerateSuggestionsForSelectedModule: () => void;
  selectedSuggestions: SuggestionCard[];
  updateSuggestion: (suggestionId: string, updater: (current: SuggestionCard) => SuggestionCard) => void;
  acceptSuggestion: (suggestion: SuggestionCard) => void;
  rejectSuggestion: (suggestionId: string) => void;
};

export function AISuggestionsPanel({
  selectedModule,
  regenerateSuggestionsForSelectedModule,
  selectedSuggestions,
  updateSuggestion,
  acceptSuggestion,
  rejectSuggestion
}: AISuggestionsPanelProps): JSX.Element {
  return (
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
                        draft: {
                          ...current.draft,
                          decompositionRationale: event.target.value
                        },
                        status: current.status === 'accepted' ? 'pending' : current.status
                      }))
                    }
                    rows={2}
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
  );
}
