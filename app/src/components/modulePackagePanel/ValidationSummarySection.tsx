import type { SemanticValidationIssue } from '../../../../shared/src';

type ValidationSummarySectionProps = {
  designHasValidationIssues: boolean;
  moduleValidationIssues: SemanticValidationIssue[];
};

export function ValidationSummarySection({
  designHasValidationIssues,
  moduleValidationIssues
}: ValidationSummarySectionProps): JSX.Element {
<<<<<<< HEAD
  const blockingCount = moduleValidationIssues.filter((issue) => issue.severity === 'error').length;
  const warningCount = moduleValidationIssues.filter((issue) => issue.severity === 'warning').length;

=======
<<<<<<< HEAD
  const blockingCount = moduleValidationIssues.filter((issue) => issue.severity === 'error').length;
  const warningCount = moduleValidationIssues.filter((issue) => issue.severity === 'warning').length;

=======
>>>>>>> origin/main
>>>>>>> origin/main
  return (
    <section className="validation-card">
      <h3>Semantic validation</h3>
      <p className="muted">Design validation status: <strong>{designHasValidationIssues ? 'issues found' : 'clean'}</strong></p>
      {moduleValidationIssues.length === 0 ? (
        <p className="ready-message">No semantic issues for selected module.</p>
      ) : (
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> origin/main
        <>
          <p className="muted">
            Selected module diagnostics: <strong>{blockingCount} blocking</strong>, <strong>{warningCount} warning</strong>.
          </p>
          <ul className="validation-list">
            {moduleValidationIssues.map((issue, index) => (
              <li key={`${issue.code}-${index}`} className={`validation-issue validation-${issue.severity}`}>
                <strong>{issue.severity.toUpperCase()}</strong> — {issue.message}
              </li>
            ))}
          </ul>
        </>
<<<<<<< HEAD
=======
=======
        <ul className="validation-list">
          {moduleValidationIssues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className={`validation-issue validation-${issue.severity}`}>
              <strong>{issue.severity.toUpperCase()}</strong> — {issue.message}
            </li>
          ))}
        </ul>
>>>>>>> origin/main
>>>>>>> origin/main
      )}
    </section>
  );
}
