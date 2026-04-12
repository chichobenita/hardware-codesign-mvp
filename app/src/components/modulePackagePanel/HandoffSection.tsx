import type { ModuleNode } from '../../../../shared/src';
import type { HandoffArtifact } from '../../ai/handoffTypes';
import type { ProviderJob } from '../../ai/providerJobTypes';
import type { DesignState } from '../../types';

type HandoffSectionProps = {
  state: DesignState;
  approvedLeafReadyModules: ModuleNode[];
  latestHandoffArtifact: HandoffArtifact | null;
  currentProviderJob: ProviderJob | null;
  isSelectedModuleHandoffReady: boolean;
  hasCurrentSelectedArtifact: boolean;
  selectModule: (moduleId: string) => void;
  markSelectedModuleAsHandedOff: () => void;
  exportLatestHandoffArtifact: () => void;
};

export function HandoffSection({
  state,
  approvedLeafReadyModules,
  latestHandoffArtifact,
  currentProviderJob,
  isSelectedModuleHandoffReady,
  hasCurrentSelectedArtifact,
  selectModule,
  markSelectedModuleAsHandedOff,
  exportLatestHandoffArtifact
}: HandoffSectionProps): JSX.Element {
  const isPending = currentProviderJob?.status === 'pending';
  const hasFailedJob = currentProviderJob?.status === 'failure';

  return (
    <section className="handoff-card">
      <h3>Handoff / Export</h3>
      <p className="muted">Approved leaf-ready modules</p>
      {approvedLeafReadyModules.length === 0 ? (
        <p className="muted">No modules are ready for handoff yet.</p>
      ) : (
        <ul className="handoff-list">
          {approvedLeafReadyModules.map((moduleNode) => {
            const handedOffAt = state.handedOffAtByModuleId[moduleNode.id];
            const latestModuleArtifact = state.handoffArtifacts.find((artifact) => artifact.moduleId === moduleNode.id);
            return (
              <li key={moduleNode.id}>
                <button
                  type="button"
                  className={moduleNode.id === state.selectedModuleId ? 'module-button selected' : 'module-button'}
                  onClick={() => selectModule(moduleNode.id)}
                >
                  <span>
                    {moduleNode.name}
                    {latestModuleArtifact ? <small className="handoff-indicator">{latestModuleArtifact.handoffStatus}</small> : null}
                  </span>
                  <small>{state.packageContentByModuleId[moduleNode.id]?.packageStatus}</small>
                </button>
                {handedOffAt ? <p className="muted">Handoff timestamp: {new Date(handedOffAt).toLocaleString()}</p> : null}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={() => { void markSelectedModuleAsHandedOff(); }} disabled={!isSelectedModuleHandoffReady || hasCurrentSelectedArtifact || isPending}>
        {hasCurrentSelectedArtifact
          ? 'Already handed off'
          : isPending
            ? 'Submitting to provider...'
            : hasFailedJob
              ? 'Retry handoff execution'
              : latestHandoffArtifact?.handoffStatus === 'stale'
                ? 'Create refreshed handoff artifact'
                : 'Mark selected module as handed_off'}
      </button>

      {currentProviderJob ? (
        <div className="handoff-job-status">
          <p className="muted">Latest provider job: <strong>{currentProviderJob.status}</strong></p>
          {currentProviderJob.status === 'failure' && currentProviderJob.error ? (
            <p className="muted">{currentProviderJob.error.errorMessage}</p>
          ) : null}
        </div>
      ) : null}

      <section className="payload-preview">
        <strong>Handoff artifact preview</strong>
        <p className="muted">Concrete handoff record built from the derived payload and prompt snapshots.</p>
        {latestHandoffArtifact ? (
          <>
            <p className="muted">
              Current artifact status: <strong>{latestHandoffArtifact.handoffStatus}</strong>
              {latestHandoffArtifact.handoffStatus === 'stale' ? ' — module handoff inputs changed after this artifact was created.' : ''}
            </p>
            <div className="artifact-actions">
              <button type="button" onClick={exportLatestHandoffArtifact}>Export handoff artifact</button>
            </div>
            <pre>{JSON.stringify(latestHandoffArtifact, null, 2)}</pre>
          </>
        ) : (
          <p className="muted">No handoff artifact created for the selected module yet.</p>
        )}
      </section>
    </section>
  );
}
