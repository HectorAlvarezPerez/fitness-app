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
import { useStore, type LoadResult } from './store/useStore';

type BootstrapStatus = 'resolving' | 'signed-out' | 'checking' | 'error' | 'ready';

type BootstrapRun = {
  userId: string;
  promise: Promise<void>;
};

const isLoadResult = (result: LoadResult | void): result is LoadResult =>
  typeof result === 'object' && result !== null && 'ok' in result;
const isLoadSuccess = (result: LoadResult | void) => isLoadResult(result) && result.ok;
const isLoadFailure = (
  result: LoadResult | void,
  reason: Exclude<LoadResult, { ok: true }>['reason']
) => isLoadResult(result) && result.ok === false && result.reason === reason;

const AuthenticatedRouteGate: React.FC<{
  status: BootstrapStatus;
  onRetry: () => void;
}> = ({ status, onRetry }) => {
  if (status === 'signed-out') {
    return <Navigate to="/" replace />;
  }

  if (status === 'ready') {
    return <Outlet />;
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050d15] px-6 text-white">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">No se pudieron cargar tus datos</h1>
          <p className="mt-3 text-sm text-slate-400">
            Comprueba tu conexión e inténtalo de nuevo.
          </p>
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

export const AppRoutes: React.FC = () => {
  const resetUserScopedState = useStore((state) => state.resetUserScopedState);
  const [bootstrapStatus, setBootstrapStatus] = React.useState<BootstrapStatus>('resolving');
  const bootstrapStatusRef = React.useRef<BootstrapStatus>('resolving');
  const currentUserIdRef = React.useRef<string | null>(null);
  const generationRef = React.useRef(0);
  const authSignalRef = React.useRef(0);
  const mountedRef = React.useRef(false);
  const inFlightRef = React.useRef<BootstrapRun | null>(null);

  const commitStatus = React.useCallback((status: BootstrapStatus) => {
    if (!mountedRef.current) return;
    bootstrapStatusRef.current = status;
    setBootstrapStatus(status);
  }, []);

  const transitionToSignedOut = React.useCallback(() => {
    generationRef.current += 1;
    currentUserIdRef.current = null;
    inFlightRef.current = null;
    useStore.getState().resetUserScopedState();
    commitStatus('signed-out');
  }, [commitStatus]);

  const startBootstrap = React.useCallback(
    (userId: string): Promise<void> => {
      const activeRun = inFlightRef.current;
      if (activeRun?.userId === userId) return activeRun.promise;

      const store = useStore.getState();
      const previousUserId = currentUserIdRef.current;
      if (
        (previousUserId && previousUserId !== userId) ||
        (store.persistedUserId && store.persistedUserId !== userId)
      ) {
        store.resetUserScopedState();
      }

      currentUserIdRef.current = userId;
      const generation = ++generationRef.current;
      commitStatus('checking');

      const context = {
        userId,
        isCurrent: () =>
          mountedRef.current &&
          currentUserIdRef.current === userId &&
          generationRef.current === generation,
      };

      const promise = (async () => {
        try {
          const results = await Promise.all([
            store.loadUserData(context),
            store.loadRoutines(context),
            store.loadFolders(context),
            store.loadWorkoutHistory(context),
            store.loadActiveWorkout(context),
            store.loadBodyMeasurements(context),
            store.loadPersonalRecords(context),
          ]);

          if (!context.isCurrent()) return;
          if (results.some((result) => isLoadFailure(result, 'signed-out'))) {
            transitionToSignedOut();
          } else if (results.every(isLoadSuccess)) {
            commitStatus('ready');
          } else if (!results.some((result) => isLoadFailure(result, 'stale'))) {
            commitStatus('error');
          }
        } catch {
          if (context.isCurrent()) commitStatus('error');
        } finally {
          if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
        }
      })();

      inFlightRef.current = { userId, promise };
      return promise;
    },
    [commitStatus, transitionToSignedOut]
  );

  const handleSessionUser = React.useCallback(
    (userId: string | null) => {
      if (!userId) {
        transitionToSignedOut();
        return;
      }

      if (
        currentUserIdRef.current === userId &&
        (inFlightRef.current?.userId === userId ||
          bootstrapStatusRef.current === 'ready' ||
          bootstrapStatusRef.current === 'error')
      ) {
        return;
      }

      void startBootstrap(userId);
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
      handleSessionUser(session?.user?.id ?? null);
    });

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      authSignalRef.current += 1;
      inFlightRef.current = null;
      subscription.unsubscribe();
    };
  }, [commitStatus, handleSessionUser, resetUserScopedState]);

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding/step1" element={<OnboardingStep1 />} />
          <Route path="/onboarding/step2" element={<OnboardingStep2 />} />
          <Route path="/onboarding/step3" element={<OnboardingStep3 />} />

          {/* Authenticated Routes with Layout */}
          <Route
            element={
              <AuthenticatedRouteGate
                status={bootstrapStatus}
                onRetry={retryInitialBootstrap}
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
