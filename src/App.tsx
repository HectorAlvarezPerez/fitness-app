import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import { useStore } from './store/useStore';

const App: React.FC = () => {
  const resetUserScopedState = useStore((state) => state.resetUserScopedState);

  React.useEffect(() => {
    initTheme();
  }, []);

  React.useEffect(() => {
    const syncSessionState = async (userId: string | null) => {
      const store = useStore.getState();

      if (!userId) {
        store.resetUserScopedState();
        return;
      }

      store.resetUserScopedState();
      await Promise.all([
        store.loadUserData(),
        store.loadRoutines(),
        store.loadFolders(),
        store.loadWorkoutHistory(),
        store.loadActiveWorkout(),
        store.loadBodyMeasurements(),
        store.loadPersonalRecords(),
      ]);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSessionState(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [resetUserScopedState]);

  return (
    <HashRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding/step1" element={<OnboardingStep1 />} />
          <Route path="/onboarding/step2" element={<OnboardingStep2 />} />
          <Route path="/onboarding/step3" element={<OnboardingStep3 />} />

          {/* Authenticated Routes with Layout */}
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
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default App;
