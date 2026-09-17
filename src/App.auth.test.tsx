import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import LandingPage from './pages/LandingPage';
import type { LoadContext, Routine, RoutineFolder } from './store/useStore';

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
    userData: null as { id: string } | null,
    savedRoutines: [] as unknown[],
    routineFolders: [] as unknown[],
    workoutHistory: [] as unknown[],
    stats: { recovery: 0, totalVolume: 0, consistency: 0, streak: 0 },
    bodyMeasurements: [] as unknown[],
    personalRecords: {} as Record<string, unknown>,
    resetUserScopedState: vi.fn(),
    getCachedUserData: vi.fn(),
    restoreCachedUserData: vi.fn(),
    applyHydratedUserData: vi.fn(),
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

  store.getCachedUserData.mockImplementation(() => ({
    userData: store.userData,
    savedRoutines: store.savedRoutines,
    routineFolders: store.routineFolders,
    workoutHistory: store.workoutHistory,
    stats: store.stats,
    bodyMeasurements: store.bodyMeasurements,
    personalRecords: store.personalRecords,
  }));
  store.restoreCachedUserData.mockImplementation(
    (_userId: string, data: Record<string, unknown>) => {
      Object.assign(store, data);
    }
  );
  store.applyHydratedUserData.mockImplementation((patch: Record<string, unknown>) => {
    Object.assign(store, patch);
  });

  return {
    store,
    userDataCache: {
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
    },
    authCallback: null as AuthCallback | null,
    getSession: vi.fn(),
    getUser: vi.fn(),
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
      getUser: harness.getUser,
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
vi.mock('./lib/userDataCache', () => ({
  readUserDataCache: harness.userDataCache.read,
  writeUserDataCache: harness.userDataCache.write,
  deleteUserDataCache: harness.userDataCache.delete,
}));
vi.mock('./components/MainLayout', () => ({ default: Outlet }));
vi.mock('./pages/Home', () => ({ default: () => <h1>Protected Home</h1> }));

const sessionFor = (userId: string): Session => ({ user: { id: userId } });
const authResponse = (session: Session) => ({ data: { session }, error: null });
const authUserResponse = (userId: string | null) => ({
  data: { user: userId ? { id: userId } : null },
  error: null,
});
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

const cachedUserData = (userId = 'u1') => ({
  userData: { id: userId },
  savedRoutines: [{ id: 'cached-routine' }],
  routineFolders: [{ id: 'cached-folder' }],
  workoutHistory: [{ id: 'cached-session' }],
  stats: { recovery: 80, totalVolume: 1000, consistency: 33, streak: 1 },
  bodyMeasurements: [{ id: 'cached-measurement' }],
  personalRecords: { Press: { weight: 100, reps: 5, date: '2026-01-01' } },
});

const cacheSnapshot = (userId = 'u1') => ({
  version: 1,
  userId,
  savedAt: Date.now(),
  data: cachedUserData(userId),
});

const freezeRefreshClock = () => {
  let currentTime = Date.now();
  const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
  return {
    advancePastCooldown: () => {
      currentTime += 5 * 60 * 1000 + 1;
    },
    restore: () => dateNow.mockRestore(),
  };
};

beforeEach(() => {
  harness.authCallback = null;
  harness.store.persistedUserId = null;
  harness.store.userData = null;
  harness.store.savedRoutines = [];
  harness.store.routineFolders = [];
  harness.store.workoutHistory = [];
  harness.store.stats = { recovery: 0, totalVolume: 0, consistency: 0, streak: 0 };
  harness.store.bodyMeasurements = [];
  harness.store.personalRecords = {};
  harness.store.resetUserScopedState.mockReset();
  harness.store.getCachedUserData.mockClear();
  harness.store.restoreCachedUserData.mockClear();
  harness.store.applyHydratedUserData.mockClear();
  harness.store.beaconFlushActiveWorkout.mockReset();
  harness.store.flushActiveWorkoutNow.mockReset().mockResolvedValue(undefined);
  harness.userDataCache.read.mockReset().mockResolvedValue(null);
  harness.userDataCache.write.mockReset().mockResolvedValue(undefined);
  harness.userDataCache.delete.mockReset().mockResolvedValue(undefined);
  for (const name of loaderNames) {
    harness.store[name].mockReset().mockResolvedValue(loadOk);
  }

  harness.getSession.mockReset().mockResolvedValue(authResponse(sessionFor('u1')));
  harness.getUser.mockReset().mockResolvedValue(authUserResponse('u1'));
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

afterEach(() => {
  vi.restoreAllMocks();
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
      expect(harness.store[name]).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          isCurrent: expect.any(Function),
          stage: expect.any(Function),
        })
      );
    }
    expect(harness.userDataCache.write).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ userData: null, savedRoutines: [], routineFolders: [] })
    );
  });

  it('restores verified cached data before the background refresh completes', async () => {
    const snapshot = cacheSnapshot();
    const pendingRecords = deferred<LoadResult>();
    harness.userDataCache.read.mockResolvedValueOnce(snapshot);
    harness.store.loadPersonalRecords.mockReturnValueOnce(pendingRecords.promise);

    renderProtectedRoute();

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    expect(harness.userDataCache.read).toHaveBeenCalledWith('u1');
    expect(harness.getUser).toHaveBeenCalledTimes(1);
    expect(harness.store.restoreCachedUserData).toHaveBeenCalledWith('u1', snapshot.data);
    expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      pendingRecords.resolve(loadOk);
      await Promise.resolve();
    });
  });

  it('waits for server-side auth verification before rendering cached user data', async () => {
    const pendingVerification = deferred<ReturnType<typeof authUserResponse>>();
    harness.userDataCache.read.mockResolvedValueOnce(cacheSnapshot());
    harness.getUser.mockReturnValueOnce(pendingVerification.promise);

    renderProtectedRoute();

    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tus datos');
    await waitFor(() => expect(harness.getUser).toHaveBeenCalledTimes(1));
    expect(harness.store.restoreCachedUserData).not.toHaveBeenCalled();
    expect(harness.store.loadRoutines).not.toHaveBeenCalled();

    await act(async () => {
      pendingVerification.resolve(authUserResponse('u1'));
      await Promise.resolve();
    });

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    expect(harness.store.restoreCachedUserData).toHaveBeenCalledTimes(1);
  });

  it('falls back to network bootstrap when cached data cannot be server-verified', async () => {
    const pendingRecords = deferred<LoadResult>();
    harness.userDataCache.read.mockResolvedValueOnce(cacheSnapshot());
    harness.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') });
    harness.store.loadPersonalRecords.mockReturnValueOnce(pendingRecords.promise);

    renderProtectedRoute();

    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tus datos');
    await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1));
    expect(harness.store.restoreCachedUserData).not.toHaveBeenCalled();

    await act(async () => {
      pendingRecords.resolve(loadOk);
      await Promise.resolve();
    });
    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
  });

  it('discards an invalid cached snapshot and continues the initial network bootstrap', async () => {
    const pendingRecords = deferred<LoadResult>();
    harness.userDataCache.read.mockResolvedValueOnce(cacheSnapshot());
    harness.store.restoreCachedUserData.mockImplementationOnce(() => {
      throw new Error('invalid cached data');
    });
    harness.store.loadPersonalRecords.mockReturnValueOnce(pendingRecords.promise);

    renderProtectedRoute();

    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tus datos');
    await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1));
    expect(harness.userDataCache.delete).toHaveBeenCalledWith('u1');

    await act(async () => {
      pendingRecords.resolve(loadOk);
      await Promise.resolve();
    });
    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
  });

  it.each([null, 'u2'] as const)(
    'clears a cached snapshot when server verification resolves to user %s',
    async (serverUserId) => {
      harness.userDataCache.read.mockResolvedValueOnce(cacheSnapshot());
      harness.getUser.mockResolvedValueOnce(authUserResponse(serverUserId));

      renderProtectedRoute();

      expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();
      expect(harness.store.restoreCachedUserData).not.toHaveBeenCalled();
      expect(harness.userDataCache.delete).toHaveBeenCalledWith('u1');
      for (const name of loaderNames) expect(harness.store[name]).not.toHaveBeenCalled();
    }
  );

  it('does not display a cache snapshot belonging to a different authenticated user', async () => {
    const pendingRecords = deferred<LoadResult>();
    harness.userDataCache.read.mockResolvedValueOnce(cacheSnapshot('u2'));
    harness.store.loadPersonalRecords.mockReturnValueOnce(pendingRecords.promise);

    renderProtectedRoute();

    expect(await screen.findByRole('status')).toHaveTextContent('Preparando tus datos');
    expect(harness.store.restoreCachedUserData).not.toHaveBeenCalled();
    expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingRecords.resolve(loadOk);
      await Promise.resolve();
    });
  });

  it('ignores a cache read that finishes after the authenticated user changes', async () => {
    const pendingCache = deferred<ReturnType<typeof cacheSnapshot> | null>();
    harness.userDataCache.read
      .mockReturnValueOnce(pendingCache.promise)
      .mockResolvedValueOnce(null);

    renderProtectedRoute();
    await waitFor(() => expect(harness.userDataCache.read).toHaveBeenCalledWith('u1'));

    act(() => harness.authCallback?.('SIGNED_IN', sessionFor('u2')));
    expect(await screen.findByText('Protected Home')).toBeInTheDocument();

    await act(async () => {
      pendingCache.resolve(cacheSnapshot('u1'));
      await Promise.resolve();
    });

    expect(harness.userDataCache.read).toHaveBeenCalledWith('u2');
    expect(harness.store.restoreCachedUserData).not.toHaveBeenCalled();
  });

  it('does not overwrite a routine edit made while cached data refreshes', async () => {
    const snapshot = cacheSnapshot();
    const pendingRecords = deferred<LoadResult>();
    const serverRoutine: Routine = {
      id: 'server-routine',
      user_id: 'u1',
      name: 'Server routine',
      exercises: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const serverFolder: RoutineFolder = {
      id: 'server-folder',
      user_id: 'u1',
      name: 'Server folder',
      order_index: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    harness.userDataCache.read.mockResolvedValueOnce(snapshot);
    harness.store.loadRoutines.mockImplementationOnce(async (context: LoadContext) => {
      context.stage?.({ savedRoutines: [serverRoutine] });
      return loadOk;
    });
    harness.store.loadFolders.mockImplementationOnce(async (context: LoadContext) => {
      context.stage?.({ routineFolders: [serverFolder] });
      return loadOk;
    });
    harness.store.loadPersonalRecords.mockReturnValueOnce(pendingRecords.promise);

    renderProtectedRoute();
    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    harness.store.savedRoutines = [{ id: 'edited-routine' }];

    await act(async () => {
      pendingRecords.resolve(loadOk);
      await Promise.resolve();
    });

    const appliedPatch = harness.store.applyHydratedUserData.mock.calls[0][0];
    expect(appliedPatch).not.toHaveProperty('savedRoutines');
    expect(appliedPatch).not.toHaveProperty('routineFolders');
    expect(harness.store.savedRoutines).toEqual([{ id: 'edited-routine' }]);
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
    harness.store.persistedUserId = 'u1';

    renderProtectedRoute();

    expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(harness.userDataCache.read).not.toHaveBeenCalled();
    expect(harness.userDataCache.delete).toHaveBeenCalledWith('u1');
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
    expect(harness.userDataCache.read).not.toHaveBeenCalled();
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

  it('coalesces duplicate initial-session signals into the active run', async () => {
    const pending = deferred<LoadResult>();
    harness.store.loadPersonalRecords.mockReturnValueOnce(pending.promise);

    renderProtectedRoute();

    await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1));
    act(() => {
      harness.authCallback?.('INITIAL_SESSION', sessionFor('u1'));
      harness.authCallback?.('INITIAL_SESSION', sessionFor('u1'));
    });

    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(1);
    }
  });

  it.each([
    ['real sign-in', 'SIGNED_IN'],
    ['successful token refresh', 'TOKEN_REFRESHED'],
  ] as const)(
    'restarts a pending same-user bootstrap after %s and ignores the old run',
    async (_, event) => {
      harness.store.persistedUserId = 'u1';
      const oldPending = deferred<LoadResult>();
      harness.store.loadPersonalRecords
        .mockReturnValueOnce(oldPending.promise)
        .mockResolvedValueOnce(loadOk);

      renderProtectedRoute();

      await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(1));
      const oldContext = harness.store.loadPersonalRecords.mock.calls[0][0];

      act(() => harness.authCallback?.(event, sessionFor('u1')));

      await waitFor(() => expect(harness.store.loadPersonalRecords).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      const newContext = harness.store.loadPersonalRecords.mock.calls[1][0];
      expect(oldContext.isCurrent()).toBe(false);
      expect(newContext.isCurrent()).toBe(true);

      await act(async () => {
        oldPending.resolve(requestFailed);
        await Promise.resolve();
      });

      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(2);
      }
    }
  );

  it('recovers a failed initial bootstrap after a same-user token refresh', async () => {
    harness.store.loadFolders.mockResolvedValueOnce(requestFailed);
    renderProtectedRoute();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus datos');

    act(() => harness.authCallback?.('TOKEN_REFRESHED', sessionFor('u1')));

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    for (const name of loaderNames) {
      expect(harness.store[name]).toHaveBeenCalledTimes(2);
    }
  });

  it('redirects an authenticated root visit to the protected home route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(await screen.findByText('Protected Home')).toBeInTheDocument();
    expect(screen.queryByText('Bienvenido de nuevo')).not.toBeInTheDocument();
  });

  it('keeps the new user ready when an older user run completes later', async () => {
    const initialSession = deferred<ReturnType<typeof authResponse>>();
    harness.getSession.mockReturnValueOnce(initialSession.promise);
    const oldResults = new Map<
      (typeof loaderNames)[number],
      ReturnType<typeof deferred<LoadResult>>
    >();
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
    harness.store.loadUserData.mockResolvedValueOnce(requestFailed).mockResolvedValueOnce(loadOk);
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

  describe('authenticated lifecycle recovery', () => {
    const lifecycleCases = [
      ['window focus', () => window.dispatchEvent(new Event('focus'))],
      ['page restore', () => window.dispatchEvent(new Event('pageshow'))],
      ['visible document', () => document.dispatchEvent(new Event('visibilitychange'))],
      ['reconnect', () => window.dispatchEvent(new Event('online'))],
    ] as const;

    it('throttles automatic refreshes for five minutes and refreshes after the window expires', async () => {
      const clock = freezeRefreshClock();
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      act(() => window.dispatchEvent(new Event('focus')));
      await act(async () => Promise.resolve());
      expect(harness.getSession).toHaveBeenCalledTimes(1);
      for (const name of loaderNames) expect(harness.store[name]).toHaveBeenCalledTimes(1);

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(2));
      for (const name of loaderNames) {
        await waitFor(() => expect(harness.store[name]).toHaveBeenCalledTimes(2));
      }
    });

    it('throttles repeated automatic retries after a failed refresh', async () => {
      const clock = freezeRefreshClock();
      harness.store.loadFolders
        .mockResolvedValueOnce(loadOk)
        .mockResolvedValueOnce(requestFailed)
        .mockResolvedValueOnce(requestFailed);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudieron actualizar tus datos'
      );

      act(() => window.dispatchEvent(new Event('focus')));
      await act(async () => Promise.resolve());
      expect(harness.getSession).toHaveBeenCalledTimes(2);
      expect(harness.store.loadFolders).toHaveBeenCalledTimes(2);

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(3));
      expect(harness.store.loadFolders).toHaveBeenCalledTimes(3);
    });

    it.each(lifecycleCases)('refreshes all contextual data on %s', async (_, dispatchEvent) => {
      const clock = freezeRefreshClock();
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      clock.advancePastCooldown();
      act(dispatchEvent);

      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(2));
      for (const name of loaderNames) {
        await waitFor(() => expect(harness.store[name]).toHaveBeenCalledTimes(2));
      }
      visibility.mockRestore();
    });

    it('refreshes ready user data after token renewal without hiding protected content', async () => {
      const pendingRecords = deferred<LoadResult>();
      harness.store.loadPersonalRecords
        .mockResolvedValueOnce(loadOk)
        .mockReturnValueOnce(pendingRecords.promise);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      act(() => harness.authCallback?.('TOKEN_REFRESHED', sessionFor('u1')));

      await waitFor(() => {
        for (const name of loaderNames) {
          expect(harness.store[name]).toHaveBeenCalledTimes(2);
        }
      });
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      await act(async () => pendingRecords.resolve(requestFailed));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudieron actualizar tus datos'
      );
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
    });

    it('allows the explicit refresh button to retry within the lifecycle cooldown', async () => {
      const clock = freezeRefreshClock();
      harness.store.loadFolders
        .mockResolvedValueOnce(loadOk)
        .mockResolvedValueOnce(requestFailed)
        .mockResolvedValueOnce(loadOk);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      act(() => harness.authCallback?.('TOKEN_REFRESHED', sessionFor('u1')));
      expect(
        await screen.findByRole('button', { name: 'Reintentar actualización' })
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar actualización' }));

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(harness.getSession).toHaveBeenCalledTimes(2);
      for (const name of loaderNames) expect(harness.store[name]).toHaveBeenCalledTimes(3);
      clock.restore();
    });

    it('ignores hidden visibility and lifecycle signals while signed out', async () => {
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      harness.getSession.mockResolvedValueOnce(authResponse(null));
      renderProtectedRoute();
      expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('pageshow'));
        window.dispatchEvent(new Event('online'));
      });

      await act(async () => Promise.resolve());
      expect(harness.getSession).toHaveBeenCalledTimes(1);
      for (const name of loaderNames) expect(harness.store[name]).not.toHaveBeenCalled();
      visibility.mockRestore();
    });

    it('does not refresh when a ready document becomes hidden', async () => {
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      act(() => document.dispatchEvent(new Event('visibilitychange')));

      await act(async () => Promise.resolve());
      expect(harness.getSession).toHaveBeenCalledTimes(1);
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(1);
      }
      visibility.mockRestore();
    });

    it('does not hydrate or hide ready content when lifecycle session is signed out', async () => {
      const clock = freezeRefreshClock();
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      harness.getSession.mockResolvedValueOnce(authResponse(null));

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));

      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(2));
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(1);
      }
    });

    it('coalesces overlapping lifecycle signals into one session lookup and loader run', async () => {
      const clock = freezeRefreshClock();
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      const lookup = deferred<ReturnType<typeof authResponse>>();
      harness.getSession.mockReturnValueOnce(lookup.promise);

      clock.advancePastCooldown();
      act(() => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('pageshow'));
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('online'));
      });
      expect(harness.getSession).toHaveBeenCalledTimes(2);

      await act(async () => lookup.resolve(authResponse(sessionFor('u1'))));
      for (const name of loaderNames) {
        await waitFor(() => expect(harness.store[name]).toHaveBeenCalledTimes(2));
      }
      expect(harness.getSession).toHaveBeenCalledTimes(2);
      visibility.mockRestore();
    });

    it('keeps protected content mounted and shows an accessible refresh error', async () => {
      const clock = freezeRefreshClock();
      harness.store.loadFolders.mockResolvedValueOnce(loadOk).mockResolvedValueOnce(requestFailed);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudieron actualizar tus datos'
      );
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar actualización' })).toBeInTheDocument();
    });

    it('clears the refresh error after a successful same-session retry', async () => {
      const clock = freezeRefreshClock();
      harness.store.loadUserData
        .mockResolvedValueOnce(loadOk)
        .mockResolvedValueOnce(requestFailed)
        .mockResolvedValueOnce(loadOk);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar actualización' }));

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(harness.getSession).toHaveBeenCalledTimes(3);
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(3);
      }
    });

    it('refuses refresh retry when the resolved session belongs to another user', async () => {
      const clock = freezeRefreshClock();
      harness.getSession
        .mockResolvedValueOnce(authResponse(sessionFor('u1')))
        .mockResolvedValueOnce(authResponse(sessionFor('u1')))
        .mockResolvedValueOnce(authResponse(sessionFor('u2')));
      harness.store.loadUserData.mockResolvedValueOnce(loadOk).mockResolvedValueOnce(requestFailed);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      fireEvent.click(await screen.findByRole('button', { name: 'Reintentar actualización' }));

      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(3));
      expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron actualizar tus datos');
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(harness.store.resetUserScopedState).not.toHaveBeenCalled();
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(2);
      }
    });

    it('rejects a refresh failure made stale by a newer auth owner', async () => {
      const clock = freezeRefreshClock();
      const staleResult = deferred<LoadResult>();
      harness.store.loadUserData
        .mockResolvedValueOnce(loadOk)
        .mockReturnValueOnce(staleResult.promise)
        .mockResolvedValueOnce(loadOk);
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      await waitFor(() => expect(harness.store.loadUserData).toHaveBeenCalledTimes(2));

      act(() => harness.authCallback?.('SIGNED_IN', sessionFor('u2')));
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      await act(async () => staleResult.resolve(requestFailed));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(3);
      }
    });

    it('starts a distinct lifecycle request for a new ready owner while the old lookup is pending', async () => {
      const clock = freezeRefreshClock();
      const staleLookup = deferred<ReturnType<typeof authResponse>>();
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      harness.getSession
        .mockReturnValueOnce(staleLookup.promise)
        .mockResolvedValueOnce(authResponse(sessionFor('u2')));

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      expect(harness.getSession).toHaveBeenCalledTimes(2);

      act(() => harness.authCallback?.('SIGNED_IN', sessionFor('u2')));
      await waitFor(() => expect(harness.store.loadUserData).toHaveBeenCalledTimes(2));
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('pageshow')));

      await waitFor(() => expect(harness.getSession).toHaveBeenCalledTimes(3));
      for (const name of loaderNames) {
        await waitFor(() => expect(harness.store[name]).toHaveBeenCalledTimes(3));
      }

      await act(async () => staleLookup.resolve(authResponse(sessionFor('u1'))));
      expect(screen.getByText('Protected Home')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      for (const name of loaderNames) {
        expect(harness.store[name].mock.calls[2][0]).toEqual(
          expect.objectContaining({ userId: 'u2' })
        );
      }
    });

    it('invalidates a pending lifecycle request on sign-out', async () => {
      const clock = freezeRefreshClock();
      const staleLookup = deferred<ReturnType<typeof authResponse>>();
      renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      harness.getSession.mockReturnValueOnce(staleLookup.promise);

      clock.advancePastCooldown();
      act(() => window.dispatchEvent(new Event('focus')));
      expect(harness.getSession).toHaveBeenCalledTimes(2);
      act(() => harness.authCallback?.('SIGNED_OUT', null));
      expect(await screen.findByText('Bienvenido de nuevo')).toBeInTheDocument();

      act(() => window.dispatchEvent(new Event('online')));
      await act(async () => staleLookup.resolve(authResponse(sessionFor('u1'))));

      expect(harness.getSession).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Bienvenido de nuevo')).toBeInTheDocument();
      expect(screen.queryByText('Protected Home')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(harness.store.resetUserScopedState).toHaveBeenCalledTimes(1);
      for (const name of loaderNames) {
        expect(harness.store[name]).toHaveBeenCalledTimes(1);
      }
    });

    it('removes lifecycle recovery listeners on unmount', async () => {
      const view = renderProtectedRoute();
      expect(await screen.findByText('Protected Home')).toBeInTheDocument();
      view.unmount();

      act(() => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('pageshow'));
        window.dispatchEvent(new Event('online'));
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(harness.getSession).toHaveBeenCalledTimes(1);
    });
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
