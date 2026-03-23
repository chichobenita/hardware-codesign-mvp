import type { ReactNode } from 'react';

type WorkspaceFrameProps = {
  title: string;
  description: string;
  statusChips?: string[];
  children: ReactNode;
};

export function WorkspaceFrame({ title, description, statusChips = [], children }: WorkspaceFrameProps): JSX.Element {
  return (
    <section className="panel secondary-workspace-panel">
      <div className="secondary-workspace-panel-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        {statusChips.length > 0 ? (
          <div className="secondary-workspace-meta" aria-label={`${title} status`}>
            {statusChips.map((chip) => (
              <span key={chip} className="secondary-workspace-chip">{chip}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="secondary-workspace-panel-body">{children}</div>
    </section>
  );
}
