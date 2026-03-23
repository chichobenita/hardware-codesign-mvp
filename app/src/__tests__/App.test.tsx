import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders the redesigned workspace shell with dedicated secondary workspaces', () => {
    render(<App />);

    expect(screen.getByRole('banner', { name: 'Workspace command ribbon' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Workspace redesign shell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Architecture canvas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Package editor', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Module Package' })).not.toBeInTheDocument();
  }, 10000);

  it('switches between dedicated secondary workspaces from the ribbon and supports closing them', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /ValidationSelected-module semantic diagnostics/i }));
    expect(screen.getByRole('heading', { name: 'Validation', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Project dataImport and export the full project JSON snapshot/i }));
    expect(screen.getByRole('heading', { name: 'Project data', level: 2 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close secondary workspace' }));
    expect(screen.getByRole('heading', { name: 'No deep-work surface open' })).toBeInTheDocument();
  });
});
