import type { HandoffProvider } from '../../ai/providers/providerTypes';
<<<<<<< HEAD
import type { ModuleNode } from '../../../../shared/src';
import type { WorkspaceMode } from '../../types';
=======
import type { ModuleNode, WorkspaceMode } from '../../types';
>>>>>>> origin/main

type PanelControlsSectionProps = {
  selectedModule?: ModuleNode;
  selectedModuleId: string;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  handoffProviders: HandoffProvider[];
  selectedProviderId: string;
  setSelectedProvider: (providerId: string) => void;
};

export function PanelControlsSection({
  selectedModule,
  selectedModuleId,
  workspaceMode,
  setWorkspaceMode,
  handoffProviders,
  selectedProviderId,
  setSelectedProvider
}: PanelControlsSectionProps): JSX.Element {
  return (
    <>
      <p className="muted">Selected module: {selectedModule?.name} ({selectedModuleId})</p>
      <label>
        Workspace mode
        <select value={workspaceMode} onChange={(event) => setWorkspaceMode(event.target.value as WorkspaceMode)} aria-label="Workspace mode">
          <option value="design">design</option>
          <option value="review">review</option>
          <option value="handoff">handoff</option>
        </select>
      </label>
      <label>
        Handoff provider
        <select value={selectedProviderId} onChange={(event) => setSelectedProvider(event.target.value)} aria-label="Handoff provider">
          {handoffProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.label}</option>
          ))}
        </select>
      </label>
      <p className="muted">
        {handoffProviders.find((provider) => provider.id === selectedProviderId)?.description ?? 'Frontend-local mock provider.'}
      </p>
    </>
  );
}
