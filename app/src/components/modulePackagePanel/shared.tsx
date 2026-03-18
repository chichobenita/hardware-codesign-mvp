import type { ReactNode } from 'react';
import type { PackageSectionStatus } from '../../types';

type ModulePackageSectionProps = {
  title: string;
  status: PackageSectionStatus;
  children: ReactNode;
};

export function ModulePackageSection({ title, status, children }: ModulePackageSectionProps): JSX.Element {
  return (
    <section className="module-package-section">
      <div className="section-header-row">
        <h3>{title}</h3>
        <StatusBadge label="status" status={status} />
      </div>
      <div>{children}</div>
    </section>
  );
}

type StatusBadgeProps = {
  label: string;
  status: PackageSectionStatus;
};

function StatusBadge({ label, status }: StatusBadgeProps): JSX.Element {
  return <span className={`status-badge status-${status}`}>{label}: {status}</span>;
}
