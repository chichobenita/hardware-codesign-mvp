import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the redesigned workspace shell with dedicated secondary workspaces', () => {
    render(<App />);

    expect(screen.getByRole('banner', { name: 'Workspace command ribbon' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Workspace redesign shell' })).toBeInTheDocument();
    expect(screen.getByLabelText('Insert commands')).toBeInTheDocument();
    expect(screen.getByLabelText('Connect commands')).toBeInTheDocument();
    expect(screen.getByLabelText('View commands')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture canvas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Package editor', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Module Package' })).not.toBeInTheDocument();
  }, 10000);

  it('switches between dedicated secondary workspaces from the ribbon and supports closing them', () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Validation' })[0]);
    expect(screen.getByRole('heading', { name: 'Validation', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Selected module clean|module issue/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Project data' })[0]);
    expect(screen.getByRole('heading', { name: 'Project data', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }));
    expect(screen.getByRole('heading', { name: 'No deep-work surface open' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Package editor' })).toBeInTheDocument();
    expect(screen.getByText('Review remains gated by readiness')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close workspace' })).toBeDisabled();
  });

  it('supports ribbon-driven insert/connect commands and keyboard shortcuts', () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText('New module name'), { target: { value: 'command_leaf' } });
    fireEvent.click(screen.getByRole('button', { name: /Add leaf block/i }));
    expect(screen.getByTestId('diagram-node-root_command_leaf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Use selected as source/i }));
    expect(screen.getByLabelText('Ribbon connection source')).toHaveValue('root_command_leaf');

    fireEvent.change(screen.getByLabelText('Ribbon connection target'), { target: { value: 'child_a' } });
    fireEvent.change(screen.getByLabelText('Ribbon connection signal'), { target: { value: 'cmd_bus' } });
    fireEvent.click(screen.getByRole('button', { name: /Connect now/i }));
    expect(screen.getByText('cmd_bus')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByText('Architecture canvas'), { key: '2', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Selection focus' })).toHaveClass('ribbon-button-active');
  });

  it('keeps insert and connection commands disabled until the draft is actionable', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Add leaf block/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Connect now/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('New module name'), { target: { value: 'ready_block' } });
    fireEvent.change(screen.getByLabelText('Ribbon connection signal'), { target: { value: 'cfg_bus' } });

    expect(screen.getByRole('button', { name: /Add leaf block/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Connect now/i })).toBeEnabled();
  });
});
