import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the redesigned workspace shell', () => {
    render(<App />);

    expect(screen.getByRole('banner', { name: 'Workspace command ribbon' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Workspace redesign shell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture canvas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secondary workspace — Package editor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Module Package' })).toBeInTheDocument();
  }, 10000);

  it('uses the ribbon to switch the transitional secondary workspace surface', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /ReviewOpen the focused review surface/i }));
    expect(screen.getByRole('heading', { name: 'Secondary workspace — Review' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /HandoffOpen the focused handoff surface/i }));
    expect(screen.getByRole('heading', { name: 'Secondary workspace — Handoff' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Package editorTransitional secondary workspace dock/i }));
    expect(screen.getByRole('heading', { name: 'Secondary workspace — Package editor' })).toBeInTheDocument();
  });
});
