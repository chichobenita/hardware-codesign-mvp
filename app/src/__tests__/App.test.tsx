import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders main workspace shell', () => {
    render(<App />);

    expect(screen.getByText('Hardware Co-Design MVP — Main Workspace')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Collaboration' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diagram Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Module Package' })).toBeInTheDocument();
  }, 10000);
});
