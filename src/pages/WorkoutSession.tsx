import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import WorkoutTimer from '../components/WorkoutTimer';
import RestTimer from '../components/RestTimer';
import { buildLastPerformanceMap } from '../lib/workoutUtils';
import { parseLocaleDecimal } from '../lib/numberUtils';
import ConfirmDialog from '../components/ConfirmDialog';
import ExerciseLibrarySheet from '../components/ExerciseLibrarySheet';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const WorkoutSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const {
    savedRoutines,
    loadRoutines,
    workoutHistory,
    loadWorkoutHistory,
    activeWorkout,
    loadActiveWorkout,
    startWorkout,
    startEmptyWorkout,
    addActiveWorkoutExercise,
    updateActiveWorkoutExerciseNotes,
    updateActiveWorkoutExerciseRest,
    updateWorkoutExerciseSets,
    setActiveWorkoutPosition,
    startRestTimer,
    clearRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    extendRestTimer,
    finishWorkout,
    cancelWorkout,
  } = useStore();

  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [activeWorkoutRestored, setActiveWorkoutRestored] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  // For past-day workouts, use the real page-open time for the live timer
  const realStartedAtRef = React.useRef<string>(new Date().toISOString());

  const setSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadRoutines();

    let cancelled = false;
    (async () => {
      await loadActiveWorkout();
      if (!cancelled) setActiveWorkoutRestored(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadRoutines, loadActiveWorkout]);

  useEffect(() => {
    if (workoutHistory.length === 0) {
      loadWorkoutHistory();
    }
  }, [workoutHistory.length, loadWorkoutHistory]);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      // First try to restore any workout already in progress (critical on iPhone resume/reload)
      if (!activeWorkoutRestored) return;

      // Safe guards
      if (activeWorkout) return;

      // The static route /routine/free/workout has no :id param,
      // so id will be undefined. Detect both cases.
      // Use location.pathname (from useLocation) instead of window.location.pathname
      // because the app uses HashRouter.
      const isFreeRoute = id === 'free' || (!id && location.pathname.includes('/free/'));

      if (!isFreeRoute && savedRoutines.length === 0) return; // Wait for routines to load

      if (isFreeRoute) {
        try {
          const dateParam = searchParams.get('date') || undefined;
          const success = await startEmptyWorkout(dateParam);
          if (cancelled) return;
          if (!success) {
            setInitializationError('No se pudo iniciar el entrenamiento libre.');
          }
        } catch (e) {
          if (cancelled) return;
          setInitializationError('Error al iniciar entrenamiento');
        }
        return;
      }

      if (id) {
        const routine = savedRoutines.find((r) => r.id === id);
        if (routine) {
          try {
            const dateParam = searchParams.get('date') || undefined;
            const success = await startWorkout(routine, dateParam);
            if (cancelled) return;
            if (!success) {
              setInitializationError('No se pudo iniciar el entrenamiento. Verifica tu conexión.');
            }
          } catch (e) {
            if (cancelled) return;
            setInitializationError('Error al iniciar entrenamiento');
          }
        } else {
          if (savedRoutines.length > 0) {
            navigate('/routine');
          }
        }
      }
    };

    initSession();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    savedRoutines,
    activeWorkout,
    startWorkout,
    startEmptyWorkout,
    navigate,
    searchParams,
    location,
    activeWorkoutRestored,
  ]);

  useEffect(() => {
    if (!activeWorkout?.currentExerciseId) return;
    setExpandedExercise((current) => current || activeWorkout.currentExerciseId || null);
  }, [activeWorkout?.currentExerciseId]);

  useEffect(() => {
    if (!activeWorkout?.currentExerciseId || typeof activeWorkout.currentSetIndex !== 'number')
      return;
    const anchor = `${activeWorkout.currentExerciseId}-${activeWorkout.currentSetIndex}`;
    const timeout = setTimeout(() => {
      const element = document.querySelector(`[data-set-anchor=\"${anchor}\"]`);
      if (element && element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [activeWorkout?.currentExerciseId, activeWorkout?.currentSetIndex]);

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise) return;

    const updatedSets = exercise.sets.map((set, idx) =>
      idx === setIndex ? { ...set, completed: !set.completed } : set
    );

    void updateWorkoutExerciseSets(exerciseId, updatedSets);
    void setActiveWorkoutPosition(exerciseId, setIndex);

    // Start rest timer if completing a set (not uncompleting)
    // Skip rest timer if this set has dropsets (no rest between dropset sub-series)
    const currentSet = exercise.sets[setIndex];
    const hasDropsets = currentSet.dropsets && currentSet.dropsets.length > 0;
    const restSeconds = exercise.restSeconds || 0;
    if (!currentSet.completed && restSeconds > 0 && !hasDropsets) {
      void startRestTimer(exerciseId, setIndex, restSeconds);
    }
  };

  const updateSetValue = (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise) return;

    const updatedSets = exercise.sets.map((set, idx) =>
      idx === setIndex ? { ...set, [field]: value } : set
    );

    void updateWorkoutExerciseSets(exerciseId, updatedSets);
    void setActiveWorkoutPosition(exerciseId, setIndex);
  };

  const updateDropsetValue = (
    exerciseId: string,
    setIndex: number,
    dropsetIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise) return;

    const updatedSets = exercise.sets.map((set, idx) => {
      if (idx !== setIndex || !set.dropsets) return set;
      const updatedDropsets = set.dropsets.map((d: any, di: number) =>
        di === dropsetIndex ? { ...d, [field]: value } : d
      );
      return { ...set, dropsets: updatedDropsets };
    });

    void updateWorkoutExerciseSets(exerciseId, updatedSets);
  };

  const handleSetDragEnd = (exerciseId: string, event: any) => {
    if (!activeWorkout) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise) return;

    const oldIndex = exercise.sets.findIndex((set: any) => set.id === active.id);
    const newIndex = exercise.sets.findIndex((set: any) => set.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(exercise.sets, oldIndex, newIndex);
    updateWorkoutExerciseSets(exerciseId, reordered);
  };

  const lastPerformanceByExercise = useMemo(
    () => buildLastPerformanceMap(workoutHistory),
    [workoutHistory]
  );

  const formatLastSet = (lastSet?: { reps?: number; weight?: number }) => {
    if (!lastSet) return 'Sin datos previos';
    const weightDefined = lastSet.weight !== undefined && lastSet.weight !== null;
    const repsDefined = lastSet.reps !== undefined && lastSet.reps !== null;

    if (!weightDefined && !repsDefined) return 'Sin datos previos';

    const weightText = weightDefined ? `${lastSet.weight}kg` : null;
    const repsText = repsDefined ? `${lastSet.reps} reps` : null;

    if (weightText && repsText) return `Última: ${weightText} × ${repsText}`;
    return `Última: ${weightText ?? repsText}`;
  };

  const addSet = (exerciseId: string) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise || exercise.sets.length === 0) return;

    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet = {
      reps: lastSet.reps,
      weight: lastSet.weight,
      completed: false,
    };

    void updateWorkoutExerciseSets(exerciseId, [...exercise.sets, newSet]);
    void setActiveWorkoutPosition(exerciseId, exercise.sets.length);
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    if (!activeWorkout) return;

    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise || exercise.sets.length <= 1) return;

    const updatedSets = exercise.sets.filter((_, idx) => idx !== setIndex);
    void updateWorkoutExerciseSets(exerciseId, updatedSets);
  };

  if (initializationError) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="mobile-card flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-500/12">
            <span className="material-symbols-outlined text-3xl text-red-300">error</span>
          </div>
          <h2 className="text-xl font-semibold text-white">Error</h2>
          <p className="text-slate-400">{initializationError}</p>
          <button
            onClick={() => navigate('/routine')}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Volver a Rutinas
          </button>
        </div>
      </div>
    );
  }

  if (!activeWorkout) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <span className="material-symbols-outlined text-primary animate-spin">
              progress_activity
            </span>
          </div>
          <p className="text-slate-400">Cargando entrenamiento...</p>
        </div>
      </div>
    );
  }

  const safeExercises = Array.isArray(activeWorkout.exercises)
    ? activeWorkout.exercises.filter(
        (ex): ex is (typeof activeWorkout.exercises)[number] => !!ex && typeof ex.name === 'string'
      )
    : [];

  const totalSets = safeExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = safeExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const isPartial = totalSets > 0 && completedSets < totalSets;
  const isFreeWorkout = !activeWorkout.routineId;

  const handleFinish = () => {
    setFinishConfirmOpen(true);
  };

  const confirmFinish = () => {
    setFinishConfirmOpen(false);
    navigate('/dashboard');
    setTimeout(() => {
      finishWorkout();
    }, 100);
  };

  const confirmCancel = () => {
    setCancelConfirmOpen(false);
    navigate('/dashboard');
    setTimeout(() => {
      cancelWorkout();
    }, 100);
  };

  const handleAddExercise = (exercise: any) => {
    if (!exercise || !exercise.name) return;
    addActiveWorkoutExercise(exercise);
    setIsLibraryOpen(false);
  };

  return (
    <div className="h-full w-full flex overflow-hidden bg-[linear-gradient(180deg,#08111d_0%,#06101a_40%,#040b13_100%)]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        <div className="flex flex-col max-w-3xl mx-auto pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]">
          {/* Header (Mobile Only for Sidebar items) */}
          <div className="sticky top-0 z-10 border-b border-[rgba(73,133,214,0.12)] bg-[rgba(6,14,24,0.92)] p-4 backdrop-blur-xl lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <Link
                to="/routine"
                className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Rutinas
              </Link>

              {/* Mobile Timer */}
              <div className="lg:hidden">
                <WorkoutTimer
                  startedAt={
                    activeWorkout.overrideDate ? realStartedAtRef.current : activeWorkout.startedAt
                  }
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl md:text-3xl font-black mb-2">{activeWorkout.routineName}</h1>
              {activeWorkout.overrideDate && (
                <div className="mb-2 flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/12 px-3 py-1.5 text-sm font-medium text-amber-200">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  Registrando entrenamiento del{' '}
                  {new Date(activeWorkout.overrideDate + 'T12:00:00').toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
              )}
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,140,255,0.14)] px-3 py-2 font-bold text-[#4ea0ff] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Añadir</span>
              </button>
            </div>

            {/* Mobile Progress Bar */}
            <div className="lg:hidden flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-[rgba(73,133,214,0.12)]">
                <div
                  className="bg-gradient-to-r from-primary to-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-400 whitespace-nowrap">
                {completedSets}/{totalSets}
              </span>
            </div>
          </div>

          {/* Exercises */}
          <div className="p-4 lg:p-6 flex flex-col gap-4">
            {safeExercises.length === 0 && (
              <div className="mobile-card border-dashed p-6 text-center text-slate-400">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    playlist_add
                  </span>
                  <div>
                    <p className="font-semibold">Rutina libre vacía</p>
                    <p className="text-sm">Añade ejercicios para empezar tu sesión.</p>
                  </div>
                  <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-4 py-2 font-bold text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Añadir ejercicio
                  </button>
                </div>
              </div>
            )}

            {safeExercises.map((exercise, exIndex) => (
              <div key={exercise.exerciseId} className="mobile-card overflow-hidden shadow-sm">
                {/* Exercise Header */}
                <div
                  className="cursor-pointer p-4 transition-colors hover:bg-[rgba(47,140,255,0.05)]"
                  onClick={() => {
                    const nextExpanded =
                      expandedExercise === exercise.exerciseId ? null : exercise.exerciseId;
                    setExpandedExercise(nextExpanded);
                    if (nextExpanded) {
                      void setActiveWorkoutPosition(exercise.exerciseId, 0);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500">#{exIndex + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {exercise.primaryMuscle}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold">{exercise.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {exercise.sets.filter((s) => s.completed).length}/{exercise.sets.length}{' '}
                        series completadas
                      </p>
                    </div>
                    <button className="p-2">
                      <span className="material-symbols-outlined text-slate-500">
                        {expandedExercise === exercise.exerciseId ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sets (collapsible) */}
                {expandedExercise === exercise.exerciseId && (
                  <div className="border-t border-[rgba(73,133,214,0.12)] bg-[rgba(10,20,34,0.72)] p-4">
                    {/* Notes Field */}
                    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-[18px]">
                          edit_note
                        </span>
                        <textarea
                          value={exercise.notes || ''}
                          onChange={(e) =>
                            void updateActiveWorkoutExerciseNotes(
                              exercise.exerciseId,
                              e.target.value
                            )
                          }
                          placeholder="Notas del ejercicio..."
                          rows={2}
                          className="w-full rounded-xl border border-[rgba(73,133,214,0.16)] bg-[rgba(7,16,27,0.86)] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-all resize-none focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
                        />
                      </div>
                      <div className="relative w-full sm:w-24">
                        <span className="material-symbols-outlined absolute left-2 top-3 text-gray-400 text-[16px]">
                          timer
                        </span>
                        <input
                          type="number"
                          value={exercise.restSeconds}
                          min={0}
                          max={600}
                          onChange={(e) =>
                            void updateActiveWorkoutExerciseRest(
                              exercise.exerciseId,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          title="Descanso del ejercicio (segundos)"
                          className="w-full rounded-xl border border-[rgba(73,133,214,0.16)] bg-[rgba(7,16,27,0.86)] py-2.5 pl-8 pr-2 text-center text-sm text-white transition-all focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
                        />
                      </div>
                      {isFreeWorkout && (
                        <button
                          onClick={() => setExpandedExercise(null)}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:border-primary hover:text-white"
                        >
                          Cerrar ejercicio
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <DndContext
                        sensors={setSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleSetDragEnd(exercise.exerciseId, event)}
                      >
                        <SortableContext
                          items={exercise.sets.map((set: any) => set.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {exercise.sets.map((set, setIndex) => {
                            const lastExercise = lastPerformanceByExercise[exercise.name];
                            const lastSet = lastExercise?.sets?.[setIndex];
                            const lastLabel = formatLastSet(lastSet);

                            return (
                              <SortableWorkoutSetRow
                                key={set.id}
                                set={set}
                                setIndex={setIndex}
                                exerciseId={exercise.exerciseId}
                                totalSets={exercise.sets.length}
                                isCurrentSet={
                                  activeWorkout.currentExerciseId === exercise.exerciseId &&
                                  activeWorkout.currentSetIndex === setIndex
                                }
                                trackingType={exercise.trackingType || 'reps'}
                                toggleSetComplete={toggleSetComplete}
                                updateSetValue={updateSetValue}
                                updateDropsetValue={updateDropsetValue}
                                removeSet={removeSet}
                                lastLabel={lastLabel}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>

                      {/* Add Set Button */}
                      <button
                        onClick={() => addSet(exercise.exerciseId)}
                        className="rounded-2xl border-2 border-dashed border-white/10 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:border-primary hover:text-white"
                      >
                        + Añadir Serie
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Static Footer Container (Mobile Only) */}
          <div className="lg:hidden fixed bottom-[var(--keyboard-inset,0px)] left-0 right-0 z-30 border-t border-[rgba(73,133,214,0.12)] bg-[rgba(6,14,24,0.94)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
            <div className="w-full space-y-2">
              {/* Timer (if active) - Footer version */}
              {activeWorkout.restTimer && (
                <div className="mb-3 border-b border-white/10 pb-3">
                  <RestTimer
                    key={activeWorkout.restTimer.instanceId}
                    variant="footer"
                    timer={activeWorkout.restTimer}
                    onComplete={() => void clearRestTimer()}
                    onPause={() => void pauseRestTimer()}
                    onResume={() => void resumeRestTimer()}
                    onAddSeconds={(seconds) => void extendRestTimer(seconds)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {/* Finish Button */}
                <button
                  onClick={handleFinish}
                  className="rounded-xl bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
                >
                  {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => setCancelConfirmOpen(true)}
                  className="py-3 rounded-xl border-2 border-red-500 text-red-500 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex h-full w-[360px] shrink-0 flex-col border-l border-[rgba(73,133,214,0.12)] bg-[rgba(6,14,24,0.92)] shadow-2xl z-20">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Timer Widget */}
          <div className="mobile-card p-6 shadow-sm">
            <h3 className="mb-2 text-center text-xs font-bold uppercase text-slate-400">
              Tiempo Transcurrido
            </h3>
            <div className="flex justify-center">
              <WorkoutTimer
                startedAt={
                  activeWorkout.overrideDate ? realStartedAtRef.current : activeWorkout.startedAt
                }
                className="text-4xl"
              />
            </div>
          </div>

          {/* Progress Widget */}
          <div className="mobile-card p-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold uppercase text-slate-400">Progreso</h3>
              <span className="text-sm font-bold text-primary dark:text-white">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="mb-2 h-3 rounded-full bg-[rgba(73,133,214,0.12)]">
              <div
                className="bg-gradient-to-r from-primary to-orange-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-400">
              {completedSets} de {totalSets} series completadas
            </p>
          </div>

          {/* Active Rest Timer Widget */}
          {activeWorkout.restTimer && (
            <div className="mobile-card border-[rgba(47,140,255,0.2)] bg-[rgba(47,140,255,0.08)] p-6 shadow-sm">
              <RestTimer
                key={activeWorkout.restTimer.instanceId}
                variant="inline"
                timer={activeWorkout.restTimer}
                onComplete={() => void clearRestTimer()}
                onPause={() => void pauseRestTimer()}
                onResume={() => void resumeRestTimer()}
                onAddSeconds={(seconds) => void extendRestTimer(seconds)}
              />
            </div>
          )}

          <div className="mt-auto space-y-3">
            <button
              onClick={handleFinish}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">flag</span>
              {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
            </button>

            <button
              onClick={() => setCancelConfirmOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/8 py-3 font-bold text-red-300 transition-all hover:bg-red-500/12"
            >
              <span className="material-symbols-outlined">close</span>
              Cancelar
            </button>
          </div>
        </div>
      </aside>

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
        onConfirm={confirmFinish}
      />

      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        title="Cancelar entrenamiento"
        description="¿Cancelar entrenamiento? Se perderá todo el progreso."
        confirmLabel="Cancelar entrenamiento"
        variant="danger"
        onCancel={() => setCancelConfirmOpen(false)}
        onConfirm={confirmCancel}
      />

      <ExerciseLibrarySheet
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddExercise={handleAddExercise}
      />
    </div>
  );
};

const SortableWorkoutSetRow: React.FC<{
  set: any;
  setIndex: number;
  exerciseId: string;
  totalSets: number;
  isCurrentSet: boolean;
  trackingType: 'reps' | 'time';
  toggleSetComplete: (exerciseId: string, setIndex: number) => void;
  updateSetValue: (
    exerciseId: string,
    setIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => void;
  updateDropsetValue: (
    exerciseId: string,
    setIndex: number,
    dropsetIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  lastLabel: string;
}> = ({
  set,
  setIndex,
  exerciseId,
  totalSets,
  isCurrentSet,
  trackingType,
  toggleSetComplete,
  updateSetValue,
  updateDropsetValue,
  removeSet,
  lastLabel,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: set.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 5 : 'auto',
  };
  const [weightDraft, setWeightDraft] = useState(set.weight ? String(set.weight) : '');
  const [isWeightFocused, setIsWeightFocused] = useState(false);

  useEffect(() => {
    if (!isWeightFocused) {
      setWeightDraft(set.weight ? String(set.weight) : '');
    }
  }, [set.weight, isWeightFocused]);

  return (
    <div
      ref={setNodeRef}
      data-set-anchor={`${exerciseId}-${setIndex}`}
      style={style}
      className={`rounded-2xl border p-3 transition-all ${
        set.completed
          ? 'border-primary/60 bg-primary/10'
          : isCurrentSet
            ? 'border-amber-400 bg-amber-400/10'
            : set.isWarmup
              ? 'border-emerald-400/20 bg-emerald-400/10 opacity-80'
              : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center text-slate-500 transition-colors hover:text-white cursor-grab touch-none active:cursor-grabbing"
            title="Arrastrar serie"
            aria-label="Arrastrar serie"
          >
            <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
          </button>
          {/* Checkbox */}
          <button
            onClick={() => toggleSetComplete(exerciseId, setIndex)}
            className={`flex size-8 items-center justify-center rounded-full border-2 transition-all ${
              set.completed ? 'border-primary bg-primary' : 'border-white/15'
            }`}
          >
            {set.completed && (
              <span className="material-symbols-outlined text-white text-[18px]">check</span>
            )}
          </button>

          <span className="w-16 shrink-0 text-sm font-bold text-slate-400">
            Serie {setIndex + 1}
          </span>

          {/* Dropset/Warmup badge */}
          {set.dropsets && set.dropsets.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white"
              title={`Dropset con ${set.dropsets.length} sub-series`}
            >
              D+{set.dropsets.length}
            </span>
          )}
          {set.isWarmup && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white"
              title="Calentamiento"
            >
              W
            </span>
          )}
        </div>

        <div
          className={`grid ${trackingType === 'time' ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-1`}
        >
          {/* Weight - hide for time-based exercises */}
          {trackingType !== 'time' && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={weightDraft}
                onFocus={() => setIsWeightFocused(true)}
                onBlur={() => {
                  setIsWeightFocused(false);
                  if (!weightDraft.trim()) {
                    updateSetValue(exerciseId, setIndex, 'weight', 0);
                    setWeightDraft('');
                    return;
                  }
                  const parsed = parseLocaleDecimal(weightDraft);
                  if (parsed === null) {
                    setWeightDraft(set.weight ? String(set.weight) : '');
                    return;
                  }
                  updateSetValue(exerciseId, setIndex, 'weight', parsed);
                  setWeightDraft(String(parsed));
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!/^[0-9]*[.,]?[0-9]*$/.test(next)) return;
                  setWeightDraft(next);
                  if (!next.trim()) {
                    updateSetValue(exerciseId, setIndex, 'weight', 0);
                    return;
                  }
                  const parsed = parseLocaleDecimal(next);
                  if (parsed !== null) {
                    updateSetValue(exerciseId, setIndex, 'weight', parsed);
                  }
                }}
                className="w-full min-w-[60px] rounded-xl border border-white/10 bg-[#07131d] px-2 py-1.5 text-center text-sm font-bold text-white sm:w-16"
              />
              <span className="text-xs text-slate-500">kg</span>
            </div>
          )}

          {/* Reps or Duration */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={set.reps ? String(set.reps) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!/^[0-9]*$/.test(raw)) return;
                updateSetValue(exerciseId, setIndex, 'reps', raw === '' ? 0 : parseInt(raw, 10));
              }}
              className="w-full min-w-[52px] rounded-xl border border-white/10 bg-[#07131d] px-2 py-1.5 text-center text-sm font-bold text-white sm:w-14"
            />
            <span className="text-xs text-slate-500">
              {trackingType === 'time' ? 'seg' : 'reps'}
            </span>
          </div>
        </div>

        {/* Delete Set */}
        {totalSets > 1 && (
          <button
            onClick={() => removeSet(exerciseId, setIndex)}
            className="self-start rounded-lg p-1 transition-colors hover:bg-red-500/10 sm:ml-auto sm:self-center"
          >
            <span className="material-symbols-outlined text-red-500 text-[18px]">close</span>
          </button>
        )}
      </div>

      <p className="mt-1 ml-10 text-xs text-slate-500">{lastLabel}</p>

      {/* Dropset sub-series */}
      {set.dropsets && set.dropsets.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {set.dropsets.map((dropset: any, dIndex: number) => (
            <div
              key={`${setIndex}-${dIndex}`}
              className="flex items-center gap-2 rounded-r-xl border-l-2 border-orange-400 bg-orange-400/10 p-2 pl-4"
            >
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 w-8">
                {setIndex + 1}.{dIndex + 1}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">
                D
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dropset.weight}
                  onChange={(e) =>
                    updateDropsetValue(
                      exerciseId,
                      setIndex,
                      dIndex,
                      'weight',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-12 rounded-lg border border-orange-400/20 bg-[#07131d] px-2 py-1 text-center text-sm font-bold text-white"
                />
                <span className="text-xs text-slate-500">kg</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dropset.reps}
                  onChange={(e) =>
                    updateDropsetValue(
                      exerciseId,
                      setIndex,
                      dIndex,
                      'reps',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-12 rounded-lg border border-orange-400/20 bg-[#07131d] px-2 py-1 text-center text-sm font-bold text-white"
                />
                <span className="text-xs text-slate-500">reps</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutSession;
