import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signUp: vi.fn(), signInWithPassword: vi.fn() } },
}));
vi.mock('../store/useStore', () => ({
  useStore: (selector: (state: { resetUserScopedState: () => void }) => unknown) =>
    selector({ resetUserScopedState: vi.fn() }),
}));

const renderLanding = async () => {
  vi.resetModules();
  const { default: LandingPage } = await import('./LandingPage');
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
};

describe('LandingPage account creation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should show the create-account tab when signup is not disabled', async () => {
    await renderLanding();

    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('should hide the create-account tab when VITE_ALLOW_SIGNUP is false', async () => {
    vi.stubEnv('VITE_ALLOW_SIGNUP', 'false');
    await renderLanding();

    expect(screen.queryByRole('button', { name: 'Crear cuenta' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Iniciar sesión' }).length).toBeGreaterThan(0);
  });
});
