import type { ModulePackage } from '../../../../shared/src';
import { getTransitionActionLabel, type TransitionReadiness } from '../../packageLifecycle';

type PackageLifecycleSectionProps = {
  packageStatus: ModulePackage['packageStatus'];
  transitionReadiness: TransitionReadiness | null;
  moveToNextPackageState: () => void;
};

export function PackageLifecycleSection({
  packageStatus,
  transitionReadiness,
  moveToNextPackageState
}: PackageLifecycleSectionProps): JSX.Element {
  return (
    <section className="lifecycle-card">
      <h3>Package lifecycle</h3>
      <p className="muted">Current state: <strong>{packageStatus}</strong></p>
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
  );
}
