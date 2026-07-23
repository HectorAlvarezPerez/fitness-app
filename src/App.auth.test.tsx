import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import LandingPage from './pages/LandingPage';

type Session = { user: { id: string } } | null;
type AuthCallback = (event: string, session: Session) => void;
type LoadResult = { ok: true } | { ok: false; reason: 'request-failed' | 'signed-out' | 'stale' };

const loaderNames = [
  'loadUserData',
  'loadRoutines',
  'loadFolders',
  'loadWorkoutHistory',
  'loadActiveWorkout',
  'loadBodyMeasurements',
  'loadPersonalRecords',
] as const;

const harness = vi.hoisted(() => {
  const store = {
    persistedUserId: null as string | null,
    resetUserScopedState: vi.fn(),
    loadUserData: vi.fn(),
    loadRoutines: vi.fn(),
    loadFolders: vi.fn(),
    loadWorkoutHistory: vi.fn(),
    loadActiveWorkout: vi.fn(),
    loadBodyMeasurements: vi.fn(),
    loadPersonalRecords: vi.fn(),
    beaconFlushActiveWorkout: vi.fn(),
    flushActiveWorkoutNow: vi.fn(),
  };

  return {
    store,
    authCallback: null as AuthCallback | null,
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    unsubscribe: vi.fn(),
  };
});

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: harness.getSession,
      onAuthStateChange: harness.onAuthStateChange,
      signInWithPassword: harness.signInWithPassword,
      signOut: harness.signOut,
      signUp: harness.signUp,
    },
  },
}));

vi.mock('./store/useStore', () => {
  const useStore = Object.assign(
    (selector: (state: typeof harness.store) => unknown) => selector(harness.store),
    { getState: () => harness.store }
  );

  return { useStore };
});

vi.mock('./lib/theme', () => ({ initTheme: vi.fn() }));
vi.mock('./components/MainLayout', () => ({ default: Outlet }));
vi.mock('./pages/Home', () => ({ default: () => <h1>Protected Home</h1> }));

const sessionFor = (userId: string): Session => ({ user: { id: userId } });
const authResponse = (session: Session) => ({ data: { session }, error: null });
const loadOk: LoadResult = { ok: true };
const requestFailed: LoadResult = { ok: false, reason: 'request-failed' };

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const renderProtectedRoute = () =>
  render(
    <MemoryRouter initialEntries={['/home']}>
      <AppRoutes />
    </MemoryRouter>
  );

beforeEach(() => {
  harness.authCallback = null;
  harness.store.persistedUserId = null;
  harness.store.resetUserScopedState.mockReset();
  harness.store.beaconFlushActiveWorkout.mockReset();
  harness.store.flushActiveWorkoutNow.mockReset().mockResolvedValue(undefined);
  for (const name of loaderNames) {
    harness.store[name].mockReset().mockResolvedValue(loadOk);
  }

  harness.getSession.mockReset().mockResolvedValue(authResponse(sessionFor('u1')));
  harness.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  harness.signOut.mockReset().mockResolvedValue({ error: null });
  harness.signUp.mockReset().mockResolvedValue({ error: null });
  harness.unsubscribe.mockReset();
  harness.onAuthStateChange.mockReset().mockImplementation((callback: AuthCallback) => {
    harness.authCallback = callback;
    return { data: { subscription: { unsubscribe: harness.unsubscribe } } };
  });
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('authenticated initial readiness', () => {
  it('withholds protected content while any required loader remains pending', async () => {
    const pending = deferred<LoadResult>();
    harness.store.loadPersonalRecords.mockReturnValueOnce(pending.promise);

    renderProtectedRoute();

    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tus datos');
    expect(screen.queryByText('Protected Home')).not.toBeInTheDocument();
    expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1);
  });

  it('renders protected content after all seven contextual loaders succeed', async () => {
    renderProtectedRoute();

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(1);
      expect(harness.store[name]).toHaveBeenCalledWith({
        userId: 'u1',
        isCurrent: expect.any(Function),
      });
    }
  });

  it('shows a recoverable initial error when required hydration fails', async () => {
    harness.store.loadFolders.mockResolvedValueOnce(requestFailed);

    renderProtectedRoute();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus datos');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Protected Home')).not.toBeInTheDocument();
  });

  it('redirects a signed-out protected request without bootstrap error or retry', async () => {
    harness.getSession.mockResolvedValueOnce(authResponse(null));

    renderProtectedRoute();

    expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    for (const name of loaderNames) {
      expect(harness.store[name]).not.toHaveBeenCalled();
    }
  });

  it('shows a recoverable error without clearing retained state when session lookup resolves with an error', async () => {
    const initialSession = deferred<{
      data: { session: Session };
      error: Error;
    }>();
    harness.store.persistedUserId = 'retained-user';
    harness.getSession.mockReturnValueOnce(initialSession.promise);

    renderProtectedRoute();
    await waitFor(() => expect(harness.authCallback).not.toBeNull());
    act(() => harness.authCallback?.('INITIAL_SESSION', null));
    initialSession.resolve({ data: { session: null }, error: new Error('session lookup failed') });

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus datos');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument();
    expect(harness.store.resetUserScopedState).not.toHaveBeenCalled();
    for (const name of loaderNames) expect(harness.store[name]).not.toHaveBeenCalled();
  });

  it('shows the same recoverable error without clearing state when session lookup rejects', async () => {
    const initialSession = deferred<ReturnType<typeof authResponse>>();
    harness.store.persistedUserId = 'retained-user';
    harness.getSession.mockReturnValueOnce(initialSession.promise);

    renderProtectedRoute();
    await waitFor(() => expect(harness.authCallback).not.toBeNull());
    act(() => harness.authCallback?.('INITIAL_SESSION', null));
    initialSession.reject(new Error('session lookup rejected'));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus datos');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument();
    expect(harness.store.resetUserScopedState).not.toHaveBeenCalled();
    for (const name of loaderNames) expect(harness.store[name]).not.toHaveBeenCalled();
  });

  it('coalesces duplicate initial-session and sign-in signals into the active run', async () => {
    const pending = deferred<LoadResult>();
    harness.store.loadPersonalRecords.mockReturnValueOnce(pending.promise);

    renderProtectedRoute();

    await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1));
    act(() => {
      harness.authCallback?.('INITIAL_SESSION', sessionFor('u1'));
      harness.authCallback?.('SIGNED_IN', sessionFor('u1'));
    });

    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps the new user ready when an older user run completes later', async () => {
    const initialSession = deferred<ReturnType<typeof authResponse>>();
    harness.getSession.mockReturnValueOnce(initialSession.promise);
    const oldResults = new Map<(typeof loaderNames)[number], ReturnType<typeof deferred<LoadResult>>>();
    for (const name of loaderNames) {
      const oldResult = deferred<LoadResult>();
      oldResults.set(name, oldResult);
      harness.store[name]
        .mockReset()
        .mockReturnValueOnce(oldResult.promise)
        .mockResolvedValueOnce(loadOk);
    }

    renderProtectedRoute();
    await waitFor(() => expect(harness.authCallback).not.toBeNull());
    act(() => harness.authCallback?.('SIGNED_IN', sessionFor('u1')));
    await waitFor(() => expect(harness.store.loadUserData).toHaveBeenCalledTimes(1));

    act(() => harness.authCallback?.('SIGNED_IN', sessionFor('u2')));

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    const oldContext = harness.store.loadUserData.mock.calls[0][0];
    const newContext = harness.store.loadUserData.mock.calls[1][0];
    expect(oldContext.isCurrent()).toBe(false);
    expect(newContext.isCurrent()).toBe(true);

    await act(async () => {
      initialSession.resolve(authResponse(sessionFor('obsolete-session')));
      for (const oldResult of oldResults.values()) oldResult.resolve(requestFailed);
      await Promise.resolve();
    });

    expect(screen.getByText('Protected Home')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(2);
    }
  });

  it('removes retry and starts no new hydration when auth signs out after an error', async () => {
    harness.store.loadFolders.mockResolvedValueOnce(requestFailed);
    renderProtectedRoute();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();

    act(() => harness.authCallback?.('SIGNED_OUT', null));

    expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(1);
    }
  });

  it('starts a new generation when same-session retry succeeds', async () => {
    harness.store.loadUserData
      .mockResolvedValueOnce(requestFailed)
      .mockResolvedValueOnce(loadOk);
    renderProtectedRoute();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    expect(harness.getSession).toHaveBeenCalledTimes(2);
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(2);
    }
  });

  it('refuses a failed u1 recovery action when retry resolves a u2 session', async () => {
    harness.getSession
      .mockResolvedValueOnce(authResponse(sessionFor('u1')))
      .mockResolvedValueOnce(authResponse(sessionFor('u2')));
    harness.store.loadUserData.mockResolvedValueOnce(requestFailed);
    renderProtectedRoute();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar tus datos');
    expect(screen.queryByText('Protected Home')).not.toBeInTheDocument();
    expect(harness.store.resetUserScopedState).not.toHaveBeenCalled();
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(1);
    }
  });

  it('replaces landing history with home after successful password login', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <LandingPage /> },
        { path: '/home', element: <h1>Home destination</h1> },
      ],
      { initialEntries: ['/'] }
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'athlete@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secure-password' },
    });
    const form = screen.getByPlaceholderText('tu@email.com').closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText('Home destination')).toBeInTheDocument();
    expect(harness.signInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.com',
      password: 'secure-password',
    });

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/home');
  });
});
