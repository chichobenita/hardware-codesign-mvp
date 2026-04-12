import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders a simplified shell with top bar, AI pane, and diagram pane by default', () => {
    render(<App />);

    expect(screen.getByRole('banner', { name: 'Workspace command ribbon' })).toBeInTheDocument();
    expect(screen.getByRole('menubar', { name: 'Workspace menu bar' })).toBeInTheDocument();
    expect(screen.getByText('Hardware Co-Design')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Insert' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Navigate' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Validation' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Handoff' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diagram Workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Package editor', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No deep-work surface open' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Module Package' })).not.toBeInTheDocument();
  }, 10000);

  it('opens focused secondary workspaces from the ribbon and closes them back to diagram-only default', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Validation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open validation workspace' }));
    expect(screen.getByRole('heading', { name: 'Validation', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Selected module clean|module issue/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open project data' }));
    expect(screen.getByRole('heading', { name: 'Project data', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }));
    expect(screen.queryByRole('heading', { name: 'Project data', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Validation', level: 2 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diagram Workspace' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    expect(screen.getByRole('button', { name: 'Close workspace' })).toBeDisabled();
  });

  it('supports ribbon-driven insert/connect commands and keyboard shortcuts', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert' }));
    fireEvent.change(screen.getByLabelText('New module name'), { target: { value: 'command_leaf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add leaf block' }));
    expect(screen.getByTestId('diagram-node-root_command_leaf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use selected as source' }));
    expect(screen.getByLabelText('Ribbon connection source')).toHaveValue('root_command_leaf');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    fireEvent.change(screen.getByLabelText('Ribbon connection target'), { target: { value: 'child_a' } });
    fireEvent.change(screen.getByLabelText('Ribbon connection signal'), { target: { value: 'cmd_bus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect now' }));
    expect(screen.getByText('cmd_bus')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('heading', { name: 'Diagram Workspace' }), { key: '2', ctrlKey: true });
    fireEvent.click(screen.getByRole('menuitem', { name: 'View' }));
    expect(screen.getByRole('button', { name: 'Set selection focus' })).toBeInTheDocument();
  });

  it('keeps insert and connection commands disabled until the draft is actionable', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert' }));
    expect(screen.getByRole('button', { name: 'Add leaf block' })).toBeDisabled();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    expect(screen.getByRole('button', { name: 'Connect now' })).toBeDisabled();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert' }));
    fireEvent.change(screen.getByLabelText('New module name'), { target: { value: 'ready_block' } });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    fireEvent.change(screen.getByLabelText('Ribbon connection signal'), { target: { value: 'cfg_bus' } });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert' }));
    expect(screen.getByRole('button', { name: 'Add leaf block' })).toBeEnabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Tools' }));
    expect(screen.getByRole('button', { name: 'Connect now' })).toBeEnabled();
  });
});
