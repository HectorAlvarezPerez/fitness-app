import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ConfirmDialog from './ConfirmDialog';
import { getActiveWorkoutPath } from '../lib/activeWorkout';
import { Button } from './ui/button';
import { Flag, Pause, Play } from 'lucide-react';

export const ActiveWorkoutFooter: React.FC = () => {
  const { activeWorkout, pauseWorkout, resumeWorkout, finishWorkout } = useStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeWorkout) return;

    const calculateElapsed = () => {
      const startTime = new Date(activeWorkout.startedAt).getTime();
      const currentTime = new Date().getTime();
      const totalElapsed = currentTime - startTime;
      const pausedTime = activeWorkout.totalPausedMs || 0;

      let currentPauseDuration = 0;
      if (activeWorkout.isPaused && activeWorkout.pausedAt) {
        currentPauseDuration = currentTime - new Date(activeWorkout.pausedAt).getTime();
      }

      return Math.floor((totalElapsed - pausedTime - currentPauseDuration) / 1000);
    };

    setElapsedSeconds(calculateElapsed());

    if (!activeWorkout.isPaused) {
      const interval = setInterval(() => {
        setElapsedSeconds(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeWorkout, activeWorkout?.isPaused]);

  if (!activeWorkout) return null;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const safeExercises = Array.isArray(activeWorkout.exercises)
    ? activeWorkout.exercises.filter(
        (ex): ex is (typeof activeWorkout.exercises)[number] => !!ex && Array.isArray(ex.sets)
      )
    : [];

  const currentExercise =
    safeExercises.find((ex) => ex.sets.some((set) => !set.completed)) ||
    safeExercises[safeExercises.length - 1];

  const totalSets = safeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = safeExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const isPartial = totalSets > 0 && completedSets < totalSets;

  return (
    <div className="fixed bottom-[calc(96px+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] left-0 right-0 z-30 md:bottom-0">
      <div className="mx-auto max-w-md px-3 md:max-w-4xl md:px-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Button variant="ghost"
              type="button"
              aria-label={`Abrir entrenamiento ${activeWorkout.routineName}`}
              onClick={() => navigate(getActiveWorkoutPath(activeWorkout.routineId))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <span className="material-symbols-outlined text-[21px]">fitness_center</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{activeWorkout.routineName}</p>
                <p className="truncate text-xs text-slate-500">
                  {currentExercise ? currentExercise.name : 'Sin ejercicios'}
                </p>
              </div>
            </Button>

            <div className="rounded-md bg-blue-50 px-2.5 py-2 text-sm font-semibold tabular-nums text-blue-700">
              {formatTime(elapsedSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setFinishConfirmOpen(true)}
                variant="ghost"
                size="icon"
                className="size-11 min-h-11 text-red-600 hover:bg-red-50"
                title={isPartial ? 'Guardar progreso' : 'Finalizar entrenamiento'}
                aria-label={isPartial ? 'Guardar progreso' : 'Finalizar entrenamiento'}
              >
                <Flag className="size-4" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                onClick={activeWorkout.isPaused ? resumeWorkout : pauseWorkout}
                variant="outline"
                size="icon"
                className="size-11 min-h-11 text-blue-700"
                aria-label={activeWorkout.isPaused ? 'Reanudar entrenamiento' : 'Pausar entrenamiento'}
              >
                {activeWorkout.isPaused ? (
                  <Play className="size-4" aria-hidden="true" />
                ) : (
                  <Pause className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={finishConfirmOpen}
        title={isPartial ? 'Guardar progreso' : 'Finalizar entrenamiento'}
        description={
          isPartial
            ? '¿Guardar progreso y finalizar? Se guardará como parcial en tu historial.'
            : '¿Finalizar entrenamiento? Se guardará en tu historial.'
        }
        confirmLabel={isPartial ? 'Guardar' : 'Finalizar'}
        variant="danger"
        onCancel={() => setFinishConfirmOpen(false)}
        onConfirm={async () => {
          setFinishConfirmOpen(false);
          await finishWorkout();
          if (!useStore.getState().activeWorkout) {
            navigate('/dashboard');
          }
        }}
      />
    </div>
  );
};
