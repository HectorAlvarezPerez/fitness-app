import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import RoutinesList from './pages/RoutinesList';
import WorkoutSession from './pages/WorkoutSession';
import WorkoutHistory from './pages/WorkoutHistory';
import ProfileData from './pages/ProfileData';
import ExercisesPage from './pages/ExercisesPage';
import AppGuide from './pages/AppGuide';
import OnboardingStep1 from './pages/OnboardingStep1';
import OnboardingStep2 from './pages/OnboardingStep2';
import OnboardingStep3 from './pages/OnboardingStep3';
import RoutineEditor from './pages/RoutineEditor';
import Settings from './pages/Settings';
import ProgressPage from './pages/ProgressPage';
import Dashboard from './pages/Dashboard';
import PersonalRecordsPage from './pages/PersonalRecordsPage';
import ExerciseEditorPage from './pages/ExerciseEditorPage';
import ErrorBoundary from './components/ErrorBoundary';

if (!import.meta.env.DEV) {
  throw new Error('La vista previa sintética solo está disponible en desarrollo.');
}

const PreviewSwitcher = () => (
  <nav
    aria-label="Pantallas de la vista previa"
    className="sticky top-0 z-[60] flex items-center justify-start gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5"
  >
    {[
      { to: '/home', label: 'Inicio' },
      { to: '/routine', label: 'Rutinas' },
      { to: '/routine/preview-push-pull/workout', label: 'Entreno' },
      { to: '/history', label: 'Historial' },
      { to: '/profile-data', label: 'Perfil' },
      { to: '/exercises', label: 'Ejercicios' },
      { to: '/routine/new', label: 'Nueva rutina' },
      { to: '/settings', label: 'Ajustes' },
      { to: '/progress', label: 'Progreso' },
      { to: '/dashboard', label: 'Estadísticas' },
      { to: '/pr', label: 'PRs' },
      { to: '/exercises/new', label: 'Nuevo ejercicio' },
    ].map(({ to, label }) => (
      <Link
        key={to}
        to={to}
        className="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      >
        {label}
      </Link>
    ))}
  </nav>
);

const captureMode = new URLSearchParams(window.location.search).get('capture') === '1';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró #root para la vista previa.');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <div className={captureMode ? 'preview-shell preview-capture' : 'preview-shell'}>
          {!captureMode && <PreviewSwitcher />}
          <div className="preview-application">
            <Routes>
              <Route path="/onboarding/step1" element={<div className="h-full overflow-y-auto"><OnboardingStep1 /></div>} />
              <Route path="/onboarding/step2" element={<div className="h-full overflow-y-auto"><OnboardingStep2 /></div>} />
              <Route path="/onboarding/step3" element={<div className="h-full overflow-y-auto"><OnboardingStep3 /></div>} />
              <Route element={<MainLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/routine" element={<RoutinesList />} />
              <Route path="/routine/new" element={<RoutineEditor />} />
              <Route path="/routine/edit/:id" element={<RoutineEditor />} />
              <Route path="/routine/:id/workout" element={<WorkoutSession />} />
              <Route path="/routine/free/workout" element={<WorkoutSession />} />
              <Route path="/history" element={<WorkoutHistory />} />
              <Route path="/profile-data" element={<ProfileData />} />
              <Route path="/exercises" element={<ExercisesPage />} />
              <Route path="/exercises/new" element={<ExerciseEditorPage />} />
              <Route path="/exercises/:id/edit" element={<ExerciseEditorPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pr" element={<PersonalRecordsPage />} />
              <Route path="/guide" element={<AppGuide />} />
              <Route path="*" element={<Home />} />
              </Route>
            </Routes>
          </div>
        </div>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
