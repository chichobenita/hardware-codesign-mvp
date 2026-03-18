import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppWorkspace } from '../App';
import { DesignStoreProvider } from '../state/designStore';
import { seedState } from '../state/designReducer';
import { createRestoredDesignState } from '../state/normalization/normalizeDesignState';
import type { DesignState } from '../types';

function cloneState(): DesignState {
  return structuredClone(seedState);
}

function renderWorkspace(initialState: DesignState = cloneState()) {
  return render(
    <DesignStoreProvider initialState={initialState}>
      <AppWorkspace />
    </DesignStoreProvider>
  );
}

describe('DiagramWorkspace', () => {
  it('renders nodes from module state', () => {
    renderWorkspace();

    expect(screen.getByTestId('diagram-node-root')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-child_a')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-child_b')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-example_uart_rx')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-example_uart_rx')).getByText('uart_rx')).toBeInTheDocument();
  });

  it('renders edges from connection state', () => {
    renderWorkspace();

    expect(screen.getByTestId('diagram-edge-child_a-root')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-root-child_b')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-example_uart_rx-root')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-edge-root-child_b')).getByText('dispatch_cmd')).toBeInTheDocument();
  });

  it('selecting a node updates selected module path through the store-backed workspace', () => {
    renderWorkspace();

    fireEvent.click(screen.getByTestId('diagram-node-root').querySelector('rect') as SVGRectElement);

    expect(screen.getByText('top_controller', { selector: '.left-panel strong' })).toBeInTheDocument();
    expect(screen.getByText(/Selected module:/)).toHaveTextContent('top_controller (root)');
    expect(screen.getByLabelText('Name')).toHaveValue('top_controller');
  });

  it('applies selected node visual state', () => {
    renderWorkspace();

    const uartNodeRect = screen.getByTestId('diagram-node-example_uart_rx').querySelector('rect');
    const rootNodeRect = screen.getByTestId('diagram-node-root').querySelector('rect');

    expect(uartNodeRect).toHaveClass('diagram-node-selected');
    expect(rootNodeRect).not.toHaveClass('diagram-node-selected');

    fireEvent.click(rootNodeRect as SVGRectElement);

    expect(screen.getByTestId('diagram-node-root').querySelector('rect')).toHaveClass('diagram-node-selected');
    expect(screen.getByTestId('diagram-node-example_uart_rx').querySelector('rect')).not.toHaveClass('diagram-node-selected');
  });

  it('remains stable after import/restore of state', () => {
    const restored = createRestoredDesignState({
      moduleList: [
        { id: 'fabric', name: 'stale_fabric', kind: 'composite' },
        { id: 'decoder', name: 'stale_decoder', kind: 'leaf' }
      ],
      selectedModuleId: 'decoder',
      connections: [{ fromModuleId: 'fabric', toModuleId: 'decoder', signal: 'cfg_bus' }],
      packageContentByModuleId: {
        fabric: {
          packageId: 'pkg_fabric',
          moduleId: 'fabric',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'control_fabric' },
          hierarchy: { parentModuleId: '', childModuleIds: ['decoder'], hierarchyPath: ['control_fabric'] },
          dependencies: { relevantDependencies: [], links: [] }
        },
        decoder: {
          packageId: 'pkg_decoder',
          moduleId: 'decoder',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'address_decoder' },
          hierarchy: { parentModuleId: 'fabric', childModuleIds: [], hierarchyPath: ['control_fabric', 'address_decoder'] },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      handedOffAtByModuleId: {}
    });

    renderWorkspace(restored);

    expect(screen.getByTestId('diagram-node-fabric')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-decoder')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-fabric-decoder')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-decoder')).getByText('address_decoder')).toBeInTheDocument();
    expect(screen.getByText(/Selected module:/)).toHaveTextContent('address_decoder (decoder)');
    expect(within(screen.getByTestId('diagram-node-decoder')).getByText('control_fabric / address_decoder')).toBeInTheDocument();
  });
});
