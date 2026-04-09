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
  it('renders nodes from module state within the current hierarchy scope', () => {
    renderWorkspace();

    expect(screen.getByTestId('diagram-node-root')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-child_a')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-child_b')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-example_uart_rx')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-example_uart_rx')).getByText('uart_rx')).toBeInTheDocument();
  });

  it('renders edges from connection state limited to the visible scope', () => {
    renderWorkspace();

    expect(screen.getByTestId('diagram-edge-cross_boundary_child_a-_root')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-cross_boundary_root-_child_b')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-cross_boundary_example_uart_rx-_root')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-edge-cross_boundary_root-_child_b')).getByText('dispatch_cmd')).toBeInTheDocument();
  });

  it('selecting a node updates selected module path through the store-backed workspace', () => {
    renderWorkspace();

    fireEvent.click(screen.getByTestId('diagram-node-root').querySelector('rect') as SVGRectElement);

    expect(screen.getByText('top_controller', { selector: '.left-panel strong' })).toBeInTheDocument();
    expect(screen.getByText('Selection: top_controller')).toBeInTheDocument();
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

  it('enters a composite hierarchy view and keeps selection synchronized', () => {
    const nestedState = createRestoredDesignState({
      moduleList: [
        { id: 'root', name: 'top_controller', kind: 'composite' },
        { id: 'child_a', name: 'input_fifo', kind: 'composite' },
        { id: 'child_b', name: 'scheduler', kind: 'leaf' },
        { id: 'nested_decoder', name: 'nested_decoder', kind: 'leaf' }
      ],
      selectedModuleId: 'child_a',
      connections: [{ fromModuleId: 'child_a', toModuleId: 'nested_decoder', signal: 'local_cfg' }],
      packageContentByModuleId: {
        root: {
          packageId: 'pkg_root',
          moduleId: 'root',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'top_controller' },
          hierarchy: { parentModuleId: '', childModuleIds: ['child_a', 'child_b'], hierarchyPath: ['top_controller'] },
          dependencies: { relevantDependencies: [], links: [] },
          decompositionStatus: { decompositionStatus: 'composite', decompositionRationale: 'top scope' }
        },
        child_a: {
          packageId: 'pkg_child_a',
          moduleId: 'child_a',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'input_fifo' },
          hierarchy: { parentModuleId: 'root', childModuleIds: ['nested_decoder'], hierarchyPath: ['top_controller', 'input_fifo'] },
          dependencies: { relevantDependencies: [], links: [] },
          decompositionStatus: { decompositionStatus: 'composite', decompositionRationale: 'nested scope' }
        },
        child_b: {
          packageId: 'pkg_child_b',
          moduleId: 'child_b',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'scheduler' },
          hierarchy: { parentModuleId: 'root', childModuleIds: [], hierarchyPath: ['top_controller', 'scheduler'] },
          dependencies: { relevantDependencies: [], links: [] }
        },
        nested_decoder: {
          packageId: 'pkg_nested_decoder',
          moduleId: 'nested_decoder',
          packageVersion: '0.1.0',
          packageStatus: 'draft',
          lastUpdatedAt: '2026-03-18T00:00:00.000Z',
          lastUpdatedBy: 'tester',
          identity: { name: 'nested_decoder' },
          hierarchy: { parentModuleId: 'child_a', childModuleIds: [], hierarchyPath: ['top_controller', 'input_fifo', 'nested_decoder'] },
          dependencies: { relevantDependencies: [], links: [] }
        }
      },
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    });

    renderWorkspace(nestedState);

    fireEvent.click(screen.getByTestId('diagram-node-child_a').querySelector('rect') as SVGRectElement);
    fireEvent.click(screen.getByRole('button', { name: 'Enter selected composite' }));

    expect(screen.getByText('Current scope')).toBeInTheDocument();
    expect(screen.getByText('input_fifo child-level view')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-child_a')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-nested_decoder')).toBeInTheDocument();
    expect(screen.queryByTestId('diagram-node-child_b')).not.toBeInTheDocument();
    expect(screen.getByText('Selection: input_fifo')).toBeInTheDocument();
  });

  it('navigates back to the parent via breadcrumb and preserves selection sync', () => {
    const initialState = cloneState();
    initialState.moduleList = [...initialState.moduleList, { id: 'composite_child', name: 'composite_child', kind: 'composite' }];
    initialState.packageContentByModuleId.composite_child = {
      packageId: 'pkg_composite_child',
      moduleId: 'composite_child',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: '2026-03-18T00:00:00.000Z',
      lastUpdatedBy: 'tester',
      identity: { name: 'composite_child' },
      hierarchy: { parentModuleId: 'root', childModuleIds: ['leaf_grandchild'], hierarchyPath: ['top_controller', 'composite_child'] },
      dependencies: { relevantDependencies: [], links: [] },
      decompositionStatus: { decompositionStatus: 'composite', decompositionRationale: 'nested block' }
    };
    initialState.moduleList.push({ id: 'leaf_grandchild', name: 'leaf_grandchild', kind: 'leaf' });
    initialState.packageContentByModuleId.leaf_grandchild = {
      packageId: 'pkg_leaf_grandchild',
      moduleId: 'leaf_grandchild',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: '2026-03-18T00:00:00.000Z',
      lastUpdatedBy: 'tester',
      identity: { name: 'leaf_grandchild' },
      hierarchy: { parentModuleId: 'composite_child', childModuleIds: [], hierarchyPath: ['top_controller', 'composite_child', 'leaf_grandchild'] },
      dependencies: { relevantDependencies: [], links: [] }
    };
    initialState.packageContentByModuleId.root.hierarchy = {
      parentModuleId: '',
      childModuleIds: [...(initialState.packageContentByModuleId.root.hierarchy?.childModuleIds ?? []), 'composite_child'],
      hierarchyPath: ['top_controller']
    };
    initialState.selectedModuleId = 'composite_child';

    renderWorkspace(initialState);

    fireEvent.click(screen.getByTestId('diagram-node-composite_child').querySelector('rect') as SVGRectElement);
    fireEvent.click(screen.getByRole('button', { name: 'Enter selected composite' }));
    fireEvent.click(screen.getByRole('button', { name: 'top_controller' }));

    expect(screen.getByText('top_controller child-level view')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-composite_child')).toBeInTheDocument();
    expect(screen.queryByTestId('diagram-node-leaf_grandchild')).not.toBeInTheDocument();
    expect(screen.getByText('Selection: top_controller')).toBeInTheDocument();
  });

  it('remains hierarchy-compatible after import/restore of state', () => {
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
          dependencies: { relevantDependencies: [], links: [] },
          decompositionStatus: { decompositionStatus: 'composite', decompositionRationale: 'restored top' }
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
      handedOffAtByModuleId: {},
      handoffArtifacts: []
    });

    renderWorkspace(restored);

    expect(screen.getByTestId('diagram-node-fabric')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-decoder')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-edge-cross_boundary_fabric-_decoder')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-decoder')).getByText('address_decoder')).toBeInTheDocument();
    expect(screen.getByText('Selection: address_decoder')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-decoder')).getByText('control_fabric / address_decoder')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Hierarchy breadcrumb' })).toBeInTheDocument();
  });

  it('switches diagram viewport framing from reducer-owned controls', () => {
    renderWorkspace();

    const svg = screen.getByRole('img', { name: 'Hardware module diagram' });
    const initialViewBox = svg.getAttribute('viewBox');

    fireEvent.click(screen.getByRole('button', { name: 'Focus selection' }));

    expect(svg.getAttribute('viewBox')).not.toEqual(initialViewBox);
    expect(screen.getByRole('button', { name: 'Focus selection' })).toHaveClass('active');

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(svg.getAttribute('viewBox')).not.toEqual(initialViewBox);

    fireEvent.click(screen.getByRole('button', { name: 'Fit scope' }));

    expect(svg.getAttribute('viewBox')).toEqual(initialViewBox);
  });

  it('allows direct composite entry from the diagram node affordance', () => {
    const initialState = cloneState();
    initialState.moduleList = [...initialState.moduleList, { id: 'composite_child', name: 'composite_child', kind: 'composite' }];
    initialState.packageContentByModuleId.composite_child = {
      packageId: 'pkg_composite_child',
      moduleId: 'composite_child',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: '2026-03-18T00:00:00.000Z',
      lastUpdatedBy: 'tester',
      identity: { name: 'composite_child' },
      hierarchy: { parentModuleId: 'root', childModuleIds: ['leaf_grandchild'], hierarchyPath: ['top_controller', 'composite_child'] },
      dependencies: { relevantDependencies: [], links: [] },
      decompositionStatus: { decompositionStatus: 'composite', decompositionRationale: 'nested block' }
    };
    initialState.moduleList.push({ id: 'leaf_grandchild', name: 'leaf_grandchild', kind: 'leaf' });
    initialState.packageContentByModuleId.leaf_grandchild = {
      packageId: 'pkg_leaf_grandchild',
      moduleId: 'leaf_grandchild',
      packageVersion: '0.1.0',
      packageStatus: 'draft',
      lastUpdatedAt: '2026-03-18T00:00:00.000Z',
      lastUpdatedBy: 'tester',
      identity: { name: 'leaf_grandchild' },
      hierarchy: { parentModuleId: 'composite_child', childModuleIds: [], hierarchyPath: ['top_controller', 'composite_child', 'leaf_grandchild'] },
      dependencies: { relevantDependencies: [], links: [] }
    };
    initialState.packageContentByModuleId.root.hierarchy = {
      parentModuleId: '',
      childModuleIds: [...(initialState.packageContentByModuleId.root.hierarchy?.childModuleIds ?? []), 'composite_child'],
      hierarchyPath: ['top_controller']
    };

    renderWorkspace(initialState);

    fireEvent.doubleClick(screen.getByTestId('diagram-node-composite_child').querySelector('rect') as SVGRectElement);

    expect(screen.getByText('composite_child child-level view')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-node-leaf_grandchild')).toBeInTheDocument();
  });

  it('collapses repeated endpoint pairs into an inspectable edge bundle', () => {
    const initialState = cloneState();
    initialState.connections = [
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_data' },
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_last' }
    ];

    renderWorkspace(initialState);

    expect(screen.getAllByText('3 signals')).toHaveLength(2);
    expect(screen.getByText('Sibling-to-sibling connectivity inside this parent scope.')).toBeInTheDocument();
    expect(screen.queryByText('fifo_data', { selector: 'svg text' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand signals' }));

    expect(screen.getByRole('button', { name: 'Collapse signals' })).toBeInTheDocument();
    expect(screen.getAllByText('fifo_data')).toHaveLength(2);
    expect(screen.getAllByText('fifo_last')).toHaveLength(2);
    expect(screen.getAllByText('fifo_valid')).toHaveLength(2);
  });

  it('collapses expanded bundles with the global bundle control', () => {
    const initialState = cloneState();
    initialState.connections = [
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_data' }
    ];

    renderWorkspace(initialState);

    fireEvent.click(screen.getByRole('button', { name: 'Expand signals' }));
    fireEvent.click(screen.getByRole('button', { name: 'Collapse bundles' }));

    expect(screen.getByRole('button', { name: 'Expand signals' })).toBeInTheDocument();
  });
  it('exposes accessible pressed and expanded states for viewport and bundle controls', () => {
    const initialState = cloneState();
    initialState.connections = [
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_data' }
    ];

    renderWorkspace(initialState);

    expect(screen.getByRole('button', { name: 'Fit scope' })).toHaveAttribute('aria-pressed', 'true');

    const bundleButton = screen.getByRole('button', { name: 'Expand signals' });
    expect(bundleButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bundleButton);

    expect(screen.getByRole('button', { name: 'Collapse signals' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('allows keyboard interaction for bundled edges', () => {
    const initialState = cloneState();
    initialState.connections = [
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_valid' },
      { fromModuleId: 'child_a', toModuleId: 'child_b', signal: 'fifo_data' }
    ];

    renderWorkspace(initialState);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Expand bundle for input_fifo to scheduler' }), { key: 'Enter' });

    expect(screen.queryByRole('button', { name: 'Expand bundle for input_fifo to scheduler' })).not.toBeInTheDocument();
    expect(screen.getAllByText('fifo_data')).toHaveLength(2);
  });
});
