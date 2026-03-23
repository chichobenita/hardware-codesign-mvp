<<<<<<< HEAD
import type { ModuleKind, ModuleNode } from '../../../../shared/src';
=======
<<<<<<< HEAD
import type { ModuleKind, ModuleNode } from '../../../../shared/src';
=======
import type { ModuleNode } from '../../types';
>>>>>>> origin/main
>>>>>>> origin/main

type DecompositionSectionProps = {
  currentHierarchyModule?: ModuleNode;
  decompositionDraftNamesText: string;
<<<<<<< HEAD
  decompositionDraftChildKind: ModuleKind;
  setDecompositionNamesText: (value: string) => void;
  setDecompositionChildKind: (value: ModuleKind) => void;
=======
<<<<<<< HEAD
  decompositionDraftChildKind: ModuleKind;
  setDecompositionNamesText: (value: string) => void;
  setDecompositionChildKind: (value: ModuleKind) => void;
=======
  decompositionDraftChildKind: ModuleNode['kind'];
  setDecompositionNamesText: (value: string) => void;
  setDecompositionChildKind: (value: ModuleNode['kind']) => void;
>>>>>>> origin/main
>>>>>>> origin/main
  decomposeSelectedModule: () => void;
};

export function DecompositionSection({
  currentHierarchyModule,
  decompositionDraftNamesText,
  decompositionDraftChildKind,
  setDecompositionNamesText,
  setDecompositionChildKind,
  decomposeSelectedModule
}: DecompositionSectionProps): JSX.Element {
  return (
    <section className="lifecycle-card">
      <h3>Hierarchy workflow</h3>
      <p className="muted">Current view scope: <strong>{currentHierarchyModule?.name ?? 'workspace'}</strong></p>
      <p className="muted">Selected module stays store-synchronized with the active hierarchy scope.</p>
      <div className="inline-form hierarchy-decompose-form">
        <textarea
          value={decompositionDraftNamesText}
          onChange={(event) => setDecompositionNamesText(event.target.value)}
          rows={2}
          placeholder="child names, comma-separated"
        />
        <select
          value={decompositionDraftChildKind}
<<<<<<< HEAD
          onChange={(event) => setDecompositionChildKind(event.target.value as ModuleKind)}
=======
<<<<<<< HEAD
          onChange={(event) => setDecompositionChildKind(event.target.value as ModuleKind)}
=======
          onChange={(event) => setDecompositionChildKind(event.target.value as ModuleNode['kind'])}
>>>>>>> origin/main
>>>>>>> origin/main
          aria-label="Decomposition child kind"
        >
          <option value="leaf">leaf children</option>
          <option value="composite">composite children</option>
        </select>
        <button type="button" onClick={decomposeSelectedModule}>Decompose selected module</button>
      </div>
    </section>
  );
}
