import React from 'react';
import { HashRouter, Navigate, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OnboardingStep1 from './pages/OnboardingStep1';
import OnboardingStep2 from './pages/OnboardingStep2';
import OnboardingStep3 from './pages/OnboardingStep3';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RoutineEditor from './pages/RoutineEditor';
import RoutinesList from './pages/RoutinesList';
import WorkoutSession from './pages/WorkoutSession';
import WorkoutHistory from './pages/WorkoutHistory';
import PersonalRecordsPage from './pages/PersonalRecordsPage';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseEditorPage from './pages/ExerciseEditorPage';

import ProgressPage from './pages/ProgressPage';
import Settings from './pages/Settings';
import ProfileData from './pages/ProfileData';
import AppGuide from './pages/AppGuide';

import MainLayout from './components/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { initTheme } from './lib/theme';
import { supabase } from './lib/supabaseClient';
import { deleteUserDataCache, readUserDataCache, writeUserDataCache } from './lib/userDataCache';
import { useStore, type CachedUserData, type LoadResult } from './store/useStore';

type BootstrapStatus = 'resolving' | 'signed-out' | 'checking' | 'error' | 'ready';

type BootstrapRun = {
  userId: string;
  promise: Promise<void>;
};

type BootstrapMode = 'initial' | 'refresh';

type LifecycleRequest = {
  userId: string;
  promise: Promise<void>;
};

const LIFECYCLE_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

const isLoadResult = (result: LoadResult | void): result is LoadResult =>
  typeof result === 'object' && result !== null && 'ok' in result;
const isLoadSuccess = (result: LoadResult | void) => isLoadResult(result) && result.ok;
const isLoadFailure = (
  result: LoadResult | void,
  reason: Exclude<LoadResult, { ok: true }>['reason']
) => isLoadResult(result) && result.ok === false && result.reason === reason;

const AuthenticatedRouteGate: React.FC<{
  status: BootstrapStatus;
  refreshError: boolean;
  onRetry: () => void;
  onRefreshRetry: () => void;
}> = ({ status, refreshError, onRetry, onRefreshRetry }) => {
  if (status === 'signed-out') {
    return <Navigate to="/" replace />;
  }

  if (status === 'ready') {
    return (
      <>
        {refreshError && (
          <div
            role="alert"
            className="flex items-center justify-center gap-4 bg-amber-950 px-4 py-3 text-sm text-amber-100"
          >
            <span>No se pudieron actualizar tus datos</span>
            <button
              type="button"
              onClick={onRefreshRetry}
              className="rounded-full border border-amber-300 px-4 py-2 font-semibold"
            >
              Reintentar actualización
            </button>
          </div>
        )}
        <Outlet />
      </>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050d15] px-6 text-white">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">No se pudieron cargar tus datos</h1>
          <p className="mt-3 text-sm text-slate-400">Comprueba tu conexión e inténtalo de nuevo.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      role="status"
      className="flex min-h-screen items-center justify-center bg-[#050d15] px-6 text-white"
    >
      <p className="text-sm text-slate-300">Preparando tus datos...</p>
    </main>
  );
};

const RootRoute: React.FC<{
  status: BootstrapStatus;
  userId: string | null;
}> = ({ status, userId }) => {
  if (userId && status !== 'signed-out') {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

export const AppRoutes: React.FC = () => {
  const resetUserScopedState = useStore((state) => state.resetUserScopedState);
  const [bootstrapStatus, setBootstrapStatus] = React.useState<BootstrapStatus>('resolving');
  const [refreshError, setRefreshError] = React.useState(false);
  const bootstrapStatusRef = React.useRef<BootstrapStatus>('resolving');
  const currentUserIdRef = React.useRef<string | null>(null);
  const generationRef = React.useRef(0);
  const authSignalRef = React.useRef(0);
  const mountedRef = React.useRef(false);
  const inFlightRef = React.useRef<BootstrapRun | null>(null);
  const lifecycleRequestRef = React.useRef<LifecycleRequest | null>(null);
  const lastRefreshAttemptAtRef = React.useRef(0);

  const commitStatus = React.useCallback((status: BootstrapStatus) => {
    if (!mountedRef.current) return;
    bootstrapStatusRef.current = status;
    setBootstrapStatus(status);
  }, []);

  const commitRefreshError = React.useCallback((hasError: boolean) => {
    if (!mountedRef.current) return;
    setRefreshError(hasError);
  }, []);

  const transitionToSignedOut = React.useCallback(() => {
    const signedOutUserId = currentUserIdRef.current ?? useStore.getState().persistedUserId;
    generationRef.current += 1;
    currentUserIdRef.current = null;
    inFlightRef.current = null;
    lifecycleRequestRef.current = null;
    lastRefreshAttemptAtRef.current = 0;
    if (signedOutUserId) void deleteUserDataCache(signedOutUserId);
    useStore.getState().resetUserScopedState();
    commitRefreshError(false);
    commitStatus('signed-out');
  }, [commitRefreshError, commitStatus]);

  const startBootstrap = React.useCallback(
    (userId: string, mode: BootstrapMode = 'initial', forceRestart = false): Promise<void> => {
      const activeRun = inFlightRef.current;
      if (activeRun?.userId === userId && !forceRestart) return activeRun.promise;

      // A new sign-in can issue a fresh access token for the same user. The
      // previous request cannot be aborted by every loader, so invalidate its
      // generation and ignore its eventual result instead of reusing it.
      if (forceRestart) inFlightRef.current = null;

      const store = useStore.getState();
      const previousUserId = currentUserIdRef.current;
      const previousStoreUserId = store.persistedUserId;
      const departingUserId =
        (previousUserId && previousUserId !== userId ? previousUserId : null) ??
        (previousStoreUserId && previousStoreUserId !== userId ? previousStoreUserId : null);
      if (departingUserId) {
        void deleteUserDataCache(departingUserId);
        lastRefreshAttemptAtRef.current = 0;
      }
      if (
        (previousUserId && previousUserId !== userId) ||
        (previousStoreUserId && previousStoreUserId !== userId)
      ) {
        store.resetUserScopedState();
      }

      if (previousUserId !== userId) lifecycleRequestRef.current = null;
      currentUserIdRef.current = userId;
      const generation = ++generationRef.current;
      commitRefreshError(false);
      if (mode === 'initial') commitStatus('checking');

      const context = {
        userId,
        isCurrent: () =>
          mountedRef.current &&
          currentUserIdRef.current === userId &&
          generationRef.current === generation,
      };

      const promise = (async () => {
        let failureMode = mode;
        try {
          if (mode === 'initial') {
            const cachedSnapshot = await readUserDataCache(userId);
            if (!context.isCurrent()) return;
            if (cachedSnapshot?.userId === userId) {
              try {
                const { data, error } = await supabase.auth.getUser();
                if (!context.isCurrent()) return;
                if (!error) {
                  if (data.user?.id !== userId) {
                    transitionToSignedOut();
                    return;
                  }

                  try {
                    store.restoreCachedUserData(userId, cachedSnapshot.data);
                    failureMode = 'refresh';
                    commitStatus('ready');
                  } catch {
                    // A malformed legacy snapshot should be discarded so the
                    // regular server bootstrap can still populate the app.
                    void deleteUserDataCache(userId);
                  }
                }
              } catch {
                // Never expose private cached data without server-verified auth.
                // The normal loaders below can still recover if the network works.
              }
            }
          }

          if (!context.isCurrent()) return;

          const baseline = store.getCachedUserData();
          const staged: Partial<CachedUserData> = {};
          let acceptingStagedData = true;
          const loaderContext = {
            ...context,
            stage: (patch: Partial<CachedUserData>) => {
              if (acceptingStagedData && context.isCurrent()) Object.assign(staged, patch);
            },
          };
          const results = await Promise.all([
            store.loadUserData(loaderContext),
            store.loadRoutines(loaderContext),
            store.loadFolders(loaderContext),
            store.loadWorkoutHistory(loaderContext),
            store.loadActiveWorkout(loaderContext),
            store.loadBodyMeasurements(loaderContext),
            store.loadPersonalRecords(loaderContext),
          ]);
          acceptingStagedData = false;

          if (!context.isCurrent()) return;
          if (results.some((result) => isLoadFailure(result, 'signed-out'))) {
            transitionToSignedOut();
          } else if (results.every(isLoadSuccess)) {
            const current = store.getCachedUserData();
            const safePatch: Partial<CachedUserData> = {};

            if (current.userData === baseline.userData && 'userData' in staged) {
              safePatch.userData = staged.userData;
            }
            if (
              current.savedRoutines === baseline.savedRoutines &&
              current.routineFolders === baseline.routineFolders
            ) {
              if ('savedRoutines' in staged) safePatch.savedRoutines = staged.savedRoutines;
              if ('routineFolders' in staged) safePatch.routineFolders = staged.routineFolders;
            }
            if (
              current.workoutHistory === baseline.workoutHistory &&
              current.stats === baseline.stats &&
              current.personalRecords === baseline.personalRecords
            ) {
              if ('workoutHistory' in staged) safePatch.workoutHistory = staged.workoutHistory;
              if ('stats' in staged) safePatch.stats = staged.stats;
              if ('personalRecords' in staged) safePatch.personalRecords = staged.personalRecords;
            }
            if (
              current.bodyMeasurements === baseline.bodyMeasurements &&
              'bodyMeasurements' in staged
            ) {
              safePatch.bodyMeasurements = staged.bodyMeasurements;
            }

            store.applyHydratedUserData(safePatch);
            lastRefreshAttemptAtRef.current = Date.now();
            void writeUserDataCache(userId, store.getCachedUserData());
            commitRefreshError(false);
            commitStatus('ready');
          } else if (!results.some((result) => isLoadFailure(result, 'stale'))) {
            if (failureMode === 'refresh') commitRefreshError(true);
            else commitStatus('error');
          }
        } catch {
          if (context.isCurrent()) {
            if (failureMode === 'refresh') commitRefreshError(true);
            else commitStatus('error');
          }
        } finally {
          if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
        }
      })();

      inFlightRef.current = { userId, promise };
      return promise;
    },
    [commitRefreshError, commitStatus, transitionToSignedOut]
  );

  const handleSessionUser = React.useCallback(
    (userId: string | null, forceRestart = false) => {
      if (!userId) {
        transitionToSignedOut();
        return;
      }

      if (
        !forceRestart &&
        currentUserIdRef.current === userId &&
        (inFlightRef.current?.userId === userId ||
          bootstrapStatusRef.current === 'ready' ||
          bootstrapStatusRef.current === 'error')
      ) {
        return;
      }

      const isCurrentReadyUser =
        currentUserIdRef.current === userId && bootstrapStatusRef.current === 'ready';
      void startBootstrap(userId, isCurrentReadyUser ? 'refresh' : 'initial', forceRestart);
    },
    [startBootstrap, transitionToSignedOut]
  );

  const retryInitialBootstrap = React.useCallback(async () => {
    const failedUserId = currentUserIdRef.current;
    if (bootstrapStatusRef.current !== 'error') return;

    const retryGeneration = ++generationRef.current;
    inFlightRef.current = null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (!mountedRef.current || generationRef.current !== retryGeneration) return;
      if (error) return;

      const sessionUserId = data.session?.user?.id ?? null;
      if (!sessionUserId) {
        transitionToSignedOut();
      } else if (failedUserId && sessionUserId !== failedUserId) {
        return;
      } else {
        void startBootstrap(sessionUserId);
      }
    } catch {
      // The existing initial error remains visible when retry cannot resolve a session.
    }
  }, [startBootstrap, transitionToSignedOut]);

  const requestLifecycleRefresh = React.useCallback(
    (force = false): Promise<void> => {
      if (bootstrapStatusRef.current !== 'ready') return Promise.resolve();

      const expectedUserId = currentUserIdRef.current;
      if (!expectedUserId) return Promise.resolve();

      const activeRequest = lifecycleRequestRef.current;
      if (activeRequest?.userId === expectedUserId) return activeRequest.promise;
      const activeBootstrap = inFlightRef.current;
      if (activeBootstrap?.userId === expectedUserId) return activeBootstrap.promise;
      const requestedAt = Date.now();
      if (!force && requestedAt - lastRefreshAttemptAtRef.current < LIFECYCLE_REFRESH_COOLDOWN_MS) {
        return Promise.resolve();
      }
      lastRefreshAttemptAtRef.current = requestedAt;

      const request = (async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (
            !mountedRef.current ||
            bootstrapStatusRef.current !== 'ready' ||
            currentUserIdRef.current !== expectedUserId
          ) {
            return;
          }

          if (error) {
            commitRefreshError(true);
            return;
          }

          const sessionUserId = data.session?.user?.id ?? null;
          if (sessionUserId !== expectedUserId) return;
          await startBootstrap(sessionUserId, 'refresh');
        } catch {
          if (
            mountedRef.current &&
            bootstrapStatusRef.current === 'ready' &&
            currentUserIdRef.current === expectedUserId
          ) {
            commitRefreshError(true);
          }
        } finally {
          if (lifecycleRequestRef.current?.promise === request) {
            lifecycleRequestRef.current = null;
          }
        }
      })();

      lifecycleRequestRef.current = { userId: expectedUserId, promise: request };
      return request;
    },
    [commitRefreshError, startBootstrap]
  );

  const retryLifecycleRefresh = React.useCallback(() => {
    if (!refreshError || bootstrapStatusRef.current !== 'ready') return;
    void requestLifecycleRefresh(true);
  }, [refreshError, requestLifecycleRefresh]);

  React.useEffect(() => {
    initTheme();
  }, []);

  // Persist active-workout progress across app suspension and reconnects.
  // - visibilitychange/pagehide: best-effort keepalive flush before the OS freezes
  //   the PWA (the moment when completed sets were getting lost on mobile).
  // - online: push any locally-newer state once connectivity returns.
  React.useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') {
        useStore.getState().beaconFlushActiveWorkout();
      }
    };
    const flushOnPageHide = () => {
      useStore.getState().beaconFlushActiveWorkout();
    };
    const syncOnOnline = () => {
      void useStore.getState().flushActiveWorkoutNow();
    };

    document.addEventListener('visibilitychange', flushOnHide);
    window.addEventListener('pagehide', flushOnPageHide);
    window.addEventListener('online', syncOnOnline);

    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
      window.removeEventListener('pagehide', flushOnPageHide);
      window.removeEventListener('online', syncOnOnline);
    };
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    const initialSessionSignal = ++authSignalRef.current;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (authSignalRef.current === initialSessionSignal) {
          if (error) {
            commitStatus('error');
          } else {
            handleSessionUser(data.session?.user?.id ?? null);
          }
        }
      })
      .catch(() => {
        if (authSignalRef.current === initialSessionSignal) commitStatus('error');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      authSignalRef.current += 1;
      const shouldRestart = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED';
      handleSessionUser(session?.user?.id ?? null, shouldRestart);
    });

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      authSignalRef.current += 1;
      inFlightRef.current = null;
      subscription.unsubscribe();
    };
  }, [commitStatus, handleSessionUser, resetUserScopedState]);

  React.useEffect(() => {
    const refresh = () => {
      void requestLifecycleRefresh();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      lifecycleRequestRef.current = null;
    };
  }, [requestLifecycleRefresh]);

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={<RootRoute status={bootstrapStatus} userId={currentUserIdRef.current} />}
        />
        <Route path="/onboarding/step1" element={<OnboardingStep1 />} />
        <Route path="/onboarding/step2" element={<OnboardingStep2 />} />
        <Route path="/onboarding/step3" element={<OnboardingStep3 />} />

        {/* Authenticated Routes with Layout */}
        <Route
          element={
            <AuthenticatedRouteGate
              status={bootstrapStatus}
              refreshError={refreshError}
              onRetry={retryInitialBootstrap}
              onRefreshRetry={retryLifecycleRefresh}
            />
          }
        >
          <Route element={<MainLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/routine" element={<RoutinesList />} />
            <Route path="/routine/new" element={<RoutineEditor />} />
            <Route path="/routine/edit/:id" element={<RoutineEditor />} />
            <Route path="/routine/free/workout" element={<WorkoutSession />} />
            <Route path="/routine/:id/workout" element={<WorkoutSession />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/pr" element={<PersonalRecordsPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercises/new" element={<ExerciseEditorPage />} />
            <Route path="/exercises/:id/edit" element={<ExerciseEditorPage />} />

            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile-data" element={<ProfileData />} />
            <Route path="/guide" element={<AppGuide />} />

            {/* Catch-all route for diagnostics */}
            <Route
              path="*"
              element={
                <div className="flex min-h-screen items-center justify-center bg-black text-white">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">404</h1>
                    <p className="text-xl">Route not found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Current Path: {window.location.hash}
                    </p>
                  </div>
                </div>
              }
            />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppRoutes />
  </HashRouter>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default App;
