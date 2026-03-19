import type { HandoffArtifact } from '../../ai/handoffTypes';

type ArtifactHistorySectionProps = {
  handoffArtifacts: HandoffArtifact[];
};

export function ArtifactHistorySection({ handoffArtifacts }: ArtifactHistorySectionProps): JSX.Element {
  return (
    <section className="handoff-history">
      <strong>Local handoff history</strong>
      {handoffArtifacts.length === 0 ? (
        <p className="muted">No local handoff records for this module yet.</p>
      ) : (
        <ul className="handoff-list">
          {handoffArtifacts.map((artifact) => (
            <li key={artifact.artifactId}>
              <span>{artifact.createdAt}</span>
              <small>{artifact.targetProviderId} · {artifact.handoffStatus}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
