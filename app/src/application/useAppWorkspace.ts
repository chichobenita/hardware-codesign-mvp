import { useDesignStore } from '../state/designStore';
import { createAppWorkspaceActions } from './workflows/appWorkspaceActions';
import { buildAppWorkspaceViewModel } from './viewModels/appWorkspaceViewModel';

export function useAppWorkspace() {
  const { state, dispatch } = useDesignStore();
  const viewModel = buildAppWorkspaceViewModel(state);
  const actions = createAppWorkspaceActions(state, dispatch, viewModel);

  return {
    state,
    viewModel,
    actions
  };
}
