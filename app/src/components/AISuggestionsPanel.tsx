import type { ModuleNode, ModulePackage, ModulePort } from '../../../shared/src';
<<<<<<< HEAD
import { getProposalDescription, getProposalTitle } from '../ai/proposals/proposalApplication';
import type { AiProposal } from '../ai/proposals/proposalTypes';
=======
import type { SuggestionCard } from '../types';
>>>>>>> origin/main

type AISuggestionsPanelProps = {
  selectedModule?: ModuleNode;
  regenerateProposalsForSelectedModule: () => void;
  selectedProposals: AiProposal[];
  updateProposal: (proposalId: string, updater: (current: AiProposal) => AiProposal) => void;
  applyProposal: (proposal: AiProposal) => void;
  rejectProposal: (proposalId: string) => void;
};

export function AISuggestionsPanel({
  selectedModule,
  regenerateProposalsForSelectedModule,
  selectedProposals,
  updateProposal,
  applyProposal,
  rejectProposal
}: AISuggestionsPanelProps): JSX.Element {
  return (
    <section className="panel left-panel">
      <h2>AI Collaboration</h2>
      <p className="muted">Mock proposals for selected module: <strong>{selectedModule?.name}</strong></p>
      <p className="suggestions-note">Proposals are not committed until you click <strong>Accept</strong>.</p>
      <button type="button" onClick={regenerateProposalsForSelectedModule}>Regenerate mock proposals</button>
      <div className="suggestions-list">
        {selectedProposals.map((proposal) => (
          <article key={proposal.proposalId} className="suggestion-card">
            <div className="suggestion-header-row">
              <h3>{getProposalTitle(proposal.proposedChange)}</h3>
              <span className={`suggestion-status suggestion-${proposal.status}`}>{proposal.status}</span>
            </div>
            <p className="muted">{getProposalDescription(proposal.proposedChange)}</p>
            <p className="muted">{proposal.rationale}</p>

            {(proposal.proposedChange.kind === 'purpose_update' || proposal.proposedChange.kind === 'behavior_update') && (
              <label>
                Suggested text (editable before accept)
                <textarea
                  value={proposal.proposedChange.kind === 'purpose_update' ? proposal.proposedChange.purposeSummary : proposal.proposedChange.behaviorSummary}
                  onChange={(event) =>
                    updateProposal(proposal.proposalId, (current) => ({
                      ...current,
                      proposedChange: current.proposedChange.kind === 'purpose_update'
                        ? { ...current.proposedChange, purposeSummary: event.target.value }
                        : current.proposedChange.kind === 'behavior_update'
                          ? { ...current.proposedChange, behaviorSummary: event.target.value }
                          : current.proposedChange,
                      status: current.status === 'applied' ? 'proposed' : current.status
                    }))
                  }
                  rows={3}
                />
              </label>
            )}

            {proposal.proposedChange.kind === 'ports_update' && (
              <div className="ports-suggestion-grid">
                {proposal.proposedChange.ports.map((port, index) => (
                  <div key={port.id} className="port-edit-row">
                    <input
                      aria-label={`Port ${index + 1} name`}
                      value={port.name}
                      onChange={(event) =>
                        updateProposal(proposal.proposalId, (current) => ({
                          ...current,
                          proposedChange: current.proposedChange.kind === 'ports_update'
                            ? {
                                ...current.proposedChange,
                                ports: current.proposedChange.ports.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, name: event.target.value } : item
                                )
                              }
                            : current.proposedChange,
                          status: current.status === 'applied' ? 'proposed' : current.status
                        }))
                      }
                      placeholder="name"
                    />
                    <select
                      aria-label={`Port ${index + 1} direction`}
                      value={port.direction}
                      onChange={(event) =>
                        updateProposal(proposal.proposalId, (current) => ({
                          ...current,
<<<<<<< HEAD
                          proposedChange: current.proposedChange.kind === 'ports_update'
                            ? {
                                ...current.proposedChange,
                                ports: current.proposedChange.ports.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, direction: event.target.value as ModulePort['direction'] } : item
                                )
                              }
                            : current.proposedChange,
                          status: current.status === 'applied' ? 'proposed' : current.status
=======
                          draft: {
                            ...current.draft,
                            ports: (current.draft.ports ?? []).map((item, itemIndex) =>
                              itemIndex === index ? { ...item, direction: event.target.value as ModulePort['direction'] } : item
                            )
                          },
                          status: current.status === 'accepted' ? 'pending' : current.status
>>>>>>> origin/main
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
                        updateProposal(proposal.proposalId, (current) => ({
                          ...current,
                          proposedChange: current.proposedChange.kind === 'ports_update'
                            ? {
                                ...current.proposedChange,
                                ports: current.proposedChange.ports.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, width: event.target.value } : item
                                )
                              }
                            : current.proposedChange,
                          status: current.status === 'applied' ? 'proposed' : current.status
                        }))
                      }
                      placeholder="width"
                    />
                  </div>
                ))}
              </div>
            )}

            {proposal.proposedChange.kind === 'decomposition_update' && (
              <>
                <label>
                  Suggested status
                  <select
                    value={proposal.proposedChange.decompositionStatus}
                    onChange={(event) =>
                      updateProposal(proposal.proposalId, (current) => ({
                        ...current,
                        proposedChange: current.proposedChange.kind === 'decomposition_update'
                          ? {
                              ...current.proposedChange,
                              decompositionStatus: event.target.value as NonNullable<ModulePackage['decompositionStatus']>['decompositionStatus']
                            }
                          : current.proposedChange,
                        status: current.status === 'applied' ? 'proposed' : current.status
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
                    value={proposal.proposedChange.decompositionRationale}
                    onChange={(event) =>
                      updateProposal(proposal.proposalId, (current) => ({
                        ...current,
                        proposedChange: current.proposedChange.kind === 'decomposition_update'
                          ? {
                              ...current.proposedChange,
                              decompositionRationale: event.target.value
                            }
                          : current.proposedChange,
                        status: current.status === 'applied' ? 'proposed' : current.status
                      }))
                    }
                    rows={2}
                  />
                </label>
              </>
            )}

            <div className="suggestion-actions">
              <button type="button" onClick={() => applyProposal(proposal)} disabled={proposal.status === 'applied'}>Accept</button>
              <button type="button" onClick={() => rejectProposal(proposal.proposalId)} disabled={proposal.status === 'rejected'}>Reject</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
