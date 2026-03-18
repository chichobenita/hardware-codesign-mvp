import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AppWorkspace } from '../App';
import { createArtifactConsistencyMarkerFromState } from '../ai/handoffArtifacts';
import { HANDOFF_ARTIFACT_SCHEMA_VERSION } from '../ai/handoffTypes';
import { MOCK_PROVIDER_ID, MOCK_STRUCTURED_PROVIDER_ID } from '../ai/providers/mockProvider';
import { DesignStoreProvider } from '../state/designStore';
import { designReducer, seedState } from '../state/designReducer';
import { createPersistedDesignSnapshot, importDesignState } from '../state/designPersistence';
import type { DesignState } from '../types';

function renderWorkspace(initialState: DesignState) {
  return render(
    <DesignStoreProvider initialState={initialState}>
      <AppWorkspace />
    </DesignStoreProvider>
  );
}

function createEligibleHandoffState(): DesignState {
  const state = structuredClone(seedState);
  state.selectedModuleId = 'example_uart_rx';
  state.ui.workspaceMode = 'handoff';
  state.packageContentByModuleId.example_uart_rx = {
    ...state.packageContentByModuleId.example_uart_rx,
    packageStatus: 'leaf_ready'
  };
  return state;
}

function createReviewEligibleState(): DesignState {
  const state = createEligibleHandoffState();
  state.ui.workspaceMode = 'review';
  return state;
}

describe('review/handoff UI flow', () => {
  const writeText = vi.fn<Clipboard['writeText']>();
  const createObjectUrl = vi.fn(() => 'blob:mock-url');
  const revokeObjectUrl = vi.fn();
  const anchorClick = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    createObjectUrl.mockClear();
    revokeObjectUrl.mockClear();
    anchorClick.mockClear();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClick);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the provider selector and keeps provider choice in store-backed UI state', async () => {
    renderWorkspace(createEligibleHandoffState());

    const selector = screen.getByRole('combobox', { name: 'Handoff provider' });
    expect(selector).toHaveValue(MOCK_PROVIDER_ID);

    fireEvent.change(selector, { target: { value: MOCK_STRUCTURED_PROVIDER_ID } });

    await waitFor(() => {
      expect(selector).toHaveValue(MOCK_STRUCTURED_PROVIDER_ID);
    });
    expect(screen.getByText(/alternate frontend-only mock provider/i)).toBeInTheDocument();
  });

  it('shows prompt and payload previews for an eligible review module', () => {
    renderWorkspace(createReviewEligibleState());

    expect(screen.getByText('GenerationPayloadMinimal v1 preview (derived)')).toBeInTheDocument();
    expect(screen.getByText('HDL generation prompt preview (derived)')).toBeInTheDocument();
    expect(screen.getByText(/\"module_name\": \"uart_rx\"/)).toBeInTheDocument();
    expect(screen.getByText(/HDL Generation Prompt v1/)).toBeInTheDocument();
  });

  it('keeps prompt and payload previews gated for an ineligible module', () => {
    const state = structuredClone(seedState);
    state.ui.workspaceMode = 'review';

    renderWorkspace(state);

    expect(screen.getByText(/Payload preview is available only for semantically valid approved leaf-ready modules/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompt preview follows the same readiness gate as the payload preview/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy generated prompt' })).not.toBeInTheDocument();
  });

  it('performs handoff from an eligible module and renders handed_off artifact/history state', async () => {
    renderWorkspace(createEligibleHandoffState());

    fireEvent.click(screen.getByRole('button', { name: 'Mark selected module as handed_off' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Already handed off' })).toBeDisabled();
    });

    expect(screen.getByText('Handoff artifact preview')).toBeInTheDocument();
    expect(screen.getByText(/"handoffStatus": "handed_off"/)).toBeInTheDocument();
    expect(screen.getByText(/mock-local-hdl · handed_off/i)).toBeInTheDocument();
  });

  it('renders previously created handoff history with correct module/provider context', () => {
    const state = createEligibleHandoffState();
    state.handoffArtifacts = [
      {
        artifactId: 'handoff_example_uart_rx_1',
        schemaVersion: HANDOFF_ARTIFACT_SCHEMA_VERSION,
        moduleId: 'example_uart_rx',
        moduleName: 'uart_rx',
        createdAt: '2026-03-18T12:00:00.000Z',
        targetProviderId: MOCK_STRUCTURED_PROVIDER_ID,
        handoffStatus: 'handed_off',
        consistencyMarker: createArtifactConsistencyMarkerFromState(state, 'example_uart_rx') ?? 'hf_test',
        generationPayloadSnapshot: {
          module_name: 'uart_rx',
          ports: [],
          purpose: '',
          basic_constraints: [],
          relevant_dependencies: [],
          behavior_rules: [],
          clock_reset_notes: ''
        },
        promptSnapshot: {
          title: 'HDL prompt for uart_rx',
          promptText: 'HDL Generation Prompt v1'
        },
        providerResponse: {
          providerId: MOCK_STRUCTURED_PROVIDER_ID,
          status: 'handed_off',
          summary: 'Structured mock provider accepted uart_rx locally.'
        }
      }
    ];
    state.handedOffAtByModuleId = {
      example_uart_rx: '2026-03-18T12:00:00.000Z'
    };
    state.packageContentByModuleId.example_uart_rx = {
      ...state.packageContentByModuleId.example_uart_rx,
      packageStatus: 'handed_off'
    };

    renderWorkspace(state);

    const historySection = screen.getByText('Local handoff history').closest('section');
    expect(historySection).not.toBeNull();
    expect(within(historySection as HTMLElement).getByText(/mock-structured-hdl · handed_off/i)).toBeInTheDocument();
    expect(screen.getByText(/"targetProviderId": "mock-structured-hdl"/)).toBeInTheDocument();
  });

  it('shows stale lifecycle status after a relevant module edit invalidates the current artifact', async () => {
    const handedOffState = designReducer(createEligibleHandoffState(), {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-03-18T12:00:00.000Z' }
    });
    const staleState = designReducer(handedOffState, {
      type: 'update_selected_module_package',
      payload: {
        updater: (current) => ({
          ...current,
          constraints: {
            ...current.constraints,
            basicConstraints: [...(current.constraints?.basicConstraints ?? []), 'Oversampling x16']
          }
        }),
        nowIso: '2026-03-18T12:10:00.000Z'
      }
    });

    renderWorkspace(staleState);

    expect(screen.getByText(/Current artifact status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Current artifact status:/i).textContent).toContain('stale');
    expect(screen.getByText(/module handoff inputs changed after this artifact was created/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create refreshed handoff artifact' })).toBeEnabled();
    expect(screen.getByText(/mock-local-hdl · stale/i)).toBeInTheDocument();
  });

  it('supports prompt copy/export and artifact export interactions through the UI', async () => {
    const handedOffState = designReducer(createEligibleHandoffState(), {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-03-18T12:00:00.000Z' }
    });

    renderWorkspace(handedOffState);

    fireEvent.click(screen.getByRole('button', { name: 'Copy generated prompt' }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export prompt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export handoff artifact' }));

    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(anchorClick).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
  });

  it('renders coherently after importing/restoring existing handoff artifact state', () => {
    const handedOffState = designReducer(createEligibleHandoffState(), {
      type: 'mark_selected_module_handed_off',
      payload: { nowIso: '2026-03-18T12:00:00.000Z' }
    });

    const imported = importDesignState(JSON.stringify(createPersistedDesignSnapshot(handedOffState)));
    expect(imported.ok).toBe(true);
    expect(imported.state).toBeDefined();
    imported.state!.ui.workspaceMode = 'handoff';

    renderWorkspace(imported.state as DesignState);

    expect(screen.getByRole('button', { name: 'Already handed off' })).toBeDisabled();
    expect(screen.getByText('Handoff artifact preview')).toBeInTheDocument();
    expect(screen.getByText('Local handoff history')).toBeInTheDocument();
  });
});
