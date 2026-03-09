import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ConfirmDialog from './ConfirmDialog';
import { getActiveWorkoutPath } from '../lib/activeWorkout';

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
        <div className="rounded-[1.55rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(7,16,27,0.94)] shadow-[0_18px_40px_rgba(2,8,15,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(getActiveWorkoutPath(activeWorkout.routineId))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(47,140,255,0.14)] text-[#4ea0ff]">
                <span className="material-symbols-outlined text-[22px]">fitness_center</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{activeWorkout.routineName}</p>
                <p className="truncate text-xs text-slate-400">
                  {currentExercise ? currentExercise.name : 'Sin ejercicios'}
                </p>
              </div>
            </button>

            <div className="rounded-full bg-[rgba(47,140,255,0.12)] px-3 py-2 text-sm font-bold tabular-nums text-[#4ea0ff]">
              {formatTime(elapsedSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFinishConfirmOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-300"
                title={isPartial ? 'Guardar progreso' : 'Finalizar entrenamiento'}
              >
                <span className="material-symbols-outlined text-[20px]">flag</span>
              </button>

              <button
                onClick={activeWorkout.isPaused ? resumeWorkout : pauseWorkout}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(47,140,255,0.14)] text-[#4ea0ff]"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {activeWorkout.isPaused ? 'play_arrow' : 'pause'}
                </span>
              </button>
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
        onConfirm={() => {
          setFinishConfirmOpen(false);
          navigate('/dashboard');
          setTimeout(() => {
            finishWorkout();
          }, 100);
        }}
      />
    </div>
  );
};
