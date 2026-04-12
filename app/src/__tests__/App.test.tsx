import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppWorkspace } from '../App';
import { seedState } from '../state/designReducer';
import { DesignStoreProvider } from '../state/designStore';
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

describe('App workspace', () => {
  it('renders the chat-first workspace shell', () => {
    renderWorkspace();

    expect(screen.getByText('Hardware Co-Design MVP - Main Workspace')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'AI chat transcript' })).toBeInTheDocument();
    expect(screen.getByLabelText('Design chat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diagram Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Module Package' })).toBeInTheDocument();
  });

  it('applies a suggestion through the chat composer', () => {
    renderWorkspace();

    expect(screen.getByLabelText('Behavior summary')).toHaveValue('Detect start bit, sample 8 data bits, emit output byte.');

    fireEvent.change(screen.getByLabelText('Design chat'), { target: { value: 'apply behavior' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByLabelText('Behavior summary')).toHaveValue('On each valid cycle, uart_rx consumes inputs, applies internal control rules, and updates outputs deterministically.');
    expect(screen.getByRole('log', { name: 'AI chat transcript' })).toHaveTextContent('Updated behavior for uart_rx');
  });

  it('creates a module from a chat command and updates the visible diagram', () => {
    renderWorkspace();

    fireEvent.change(screen.getByLabelText('Design chat'), { target: { value: 'create module packet_parser' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByTestId('diagram-node-root_packet_parser')).toBeInTheDocument();
    expect(within(screen.getByTestId('diagram-node-root_packet_parser')).getByText('packet_parser')).toBeInTheDocument();
    expect(screen.getByText(/Selected module:/)).toHaveTextContent('packet_parser (root_packet_parser)');
    expect(screen.getByRole('log', { name: 'AI chat transcript' })).toHaveTextContent('Created leaf module packet_parser');
  });
});
