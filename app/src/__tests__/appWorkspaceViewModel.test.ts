import { describe, expect, it } from 'vitest';
import { buildAppWorkspaceViewModel } from '../application/viewModels/appWorkspaceViewModel';
import { seedState } from '../state/designReducer';

describe('buildAppWorkspaceViewModel', () => {
  it('assembles the selected module workflow state from store state', () => {
    const viewModel = buildAppWorkspaceViewModel(seedState);

    expect(viewModel.selectedModule?.id).toBe(seedState.selectedModuleId);
    expect(viewModel.currentPackageContent.moduleId).toBe(seedState.selectedModuleId);
    expect(viewModel.handoffProviders.length).toBeGreaterThan(0);
<<<<<<< HEAD
    expect(viewModel.selectedProposals).toEqual(seedState.proposalsByModuleId[seedState.selectedModuleId] ?? []);
=======
    expect(viewModel.selectedSuggestions).toEqual(seedState.suggestionsByModuleId[seedState.selectedModuleId] ?? []);
>>>>>>> origin/main
  });
});
