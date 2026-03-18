import type { SemanticValidationIssue } from '../../../../shared/src';

type ValidationSummarySectionProps = {
  designHasValidationIssues: boolean;
  moduleValidationIssues: SemanticValidationIssue[];
};

export function ValidationSummarySection({
  designHasValidationIssues,
  moduleValidationIssues
}: ValidationSummarySectionProps): JSX.Element {
  return (
    <section className="validation-card">
      <h3>Semantic validation</h3>
      <p className="muted">Design validation status: <strong>{designHasValidationIssues ? 'issues found' : 'clean'}</strong></p>
      {moduleValidationIssues.length === 0 ? (
        <p className="ready-message">No semantic issues for selected module.</p>
      ) : (
        <ul className="validation-list">
          {moduleValidationIssues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className={`validation-issue validation-${issue.severity}`}>
              <strong>{issue.severity.toUpperCase()}</strong> — {issue.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
