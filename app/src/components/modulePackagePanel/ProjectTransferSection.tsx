type ProjectTransferSectionProps = {
  projectImportError: string | null;
  exportCurrentProject: () => void;
  importProjectFromFile: (file: File | null) => Promise<void>;
};

export function ProjectTransferSection({
  projectImportError,
  exportCurrentProject,
  importProjectFromFile
}: ProjectTransferSectionProps): JSX.Element {
  return (
    <section className="project-transfer-card">
      <h3>Project JSON</h3>
      <p className="muted">Export or restore the full MVP project snapshot.</p>
      <div className="project-transfer-actions">
        <button type="button" onClick={exportCurrentProject}>Export project JSON</button>
        <label className="button-like file-upload-button">
          Import project JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              await importProjectFromFile(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {projectImportError ? <p className="import-error">{projectImportError}</p> : null}
    </section>
  );
}
