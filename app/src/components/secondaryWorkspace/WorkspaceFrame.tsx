import type { ReactNode } from 'react';

type WorkspaceFrameProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function WorkspaceFrame({ title, description, children }: WorkspaceFrameProps): JSX.Element {
  return (
    <section className="panel secondary-workspace-panel">
      <div className="secondary-workspace-panel-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
      </div>
      <div className="secondary-workspace-panel-body">{children}</div>
    </section>
  );
}
