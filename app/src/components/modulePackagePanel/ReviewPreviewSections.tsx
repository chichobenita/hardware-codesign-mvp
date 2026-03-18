import type { GenerationPayloadMinimal } from '../../../../shared/src';
import type { PromptBuildResult } from '../../ai/promptTypes';

type PayloadPreviewSectionProps = {
  canShowPayloadPreview: boolean;
  isSelectedModuleValidForReviewOrHandoff: boolean;
  generatedPayload: GenerationPayloadMinimal;
};

export function PayloadPreviewSection({
  canShowPayloadPreview,
  isSelectedModuleValidForReviewOrHandoff,
  generatedPayload
}: PayloadPreviewSectionProps): JSX.Element {
  return (
    <section className="payload-preview">
      <strong>GenerationPayloadMinimal v1 preview (derived)</strong>
      {canShowPayloadPreview && isSelectedModuleValidForReviewOrHandoff ? (
        <pre>{JSON.stringify(generatedPayload, null, 2)}</pre>
      ) : (
        <p className="muted">
          Payload preview is available only for semantically valid approved leaf-ready modules.
          Resolve semantic errors, ensure this module is a leaf, set decomposition to approved_leaf, and transition package status to leaf_ready.
        </p>
      )}
    </section>
  );
}

type PromptPreviewSectionProps = {
  canShowPayloadPreview: boolean;
  isSelectedModuleValidForReviewOrHandoff: boolean;
  generatedPrompt: PromptBuildResult | null;
  copyGeneratedPrompt: () => Promise<void>;
  exportGeneratedPrompt: () => void;
};

export function PromptPreviewSection({
  canShowPayloadPreview,
  isSelectedModuleValidForReviewOrHandoff,
  generatedPrompt,
  copyGeneratedPrompt,
  exportGeneratedPrompt
}: PromptPreviewSectionProps): JSX.Element {
  return (
    <section className="payload-preview">
      <strong>HDL generation prompt preview (derived)</strong>
      <p className="muted">Structured handoff prompt for a downstream AI code engine.</p>
      {canShowPayloadPreview && isSelectedModuleValidForReviewOrHandoff && generatedPrompt ? (
        <>
          <div className="artifact-actions">
            <button type="button" onClick={() => { void copyGeneratedPrompt(); }}>Copy generated prompt</button>
            <button type="button" onClick={exportGeneratedPrompt}>Export prompt</button>
          </div>
          <pre>{generatedPrompt.promptText}</pre>
        </>
      ) : (
        <p className="muted">
          Prompt preview follows the same readiness gate as the payload preview so review and handoff stay aligned.
        </p>
      )}
    </section>
  );
}
