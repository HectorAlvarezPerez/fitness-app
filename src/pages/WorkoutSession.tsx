import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  useStore,
  type ActiveWorkoutExercise,
  type LoadResult,
  type RoutineUpdateCandidate,
} from '../store/useStore';
import WorkoutTimer from '../components/WorkoutTimer';
import RestTimer from '../components/RestTimer';
import { buildLastPerformanceMap } from '../lib/workoutUtils';
import { parseLocaleDecimal } from '../lib/numberUtils';
import { createId } from '../lib/id';
import {
  formatCardioDuration,
  formatPace,
  isCardioExercise,
  sanitizeCardioMetrics,
  type CardioMetricKey,
} from '../lib/trainingMetrics';
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

export const getWorkoutContentReservation = (hasRestTimer: boolean) => ({
  mobileBaseRem: hasRestTimer ? (19 as const) : (9 as const),
  desktopBaseRem: 9 as const,
  includesSafeAreaInset: true as const,
  includesKeyboardInset: true as const,
});

const CARDIO_INPUTS: Array<{
  key: CardioMetricKey;
  label: string;
  unit: string;
  step?: string;
}> = [
  { key: 'durationSeconds', label: 'Duración', unit: 'seg' },
  { key: 'distanceKm', label: 'Distancia', unit: 'km', step: '0.01' },
  { key: 'paceSecondsPerKm', label: 'Ritmo', unit: 'seg/km' },
  { key: 'averageHeartRateBpm', label: 'FC media', unit: 'ppm' },
  { key: 'maxHeartRateBpm', label: 'FC máxima', unit: 'ppm' },
  { key: 'cadenceRpm', label: 'Cadencia', unit: 'rpm' },
  { key: 'calories', label: 'Calorías', unit: 'kcal' },
  { key: 'rpe', label: 'RPE', unit: '0-10', step: '0.5' },
];

const formatPrescription = (
  prescription?: {
    repMin?: number;
    repMax?: number;
    restMinSeconds?: number;
    restMaxSeconds?: number;
  },
  trackingType: 'reps' | 'time' = 'reps'
) => {
  if (!prescription) return null;
  const reps =
    prescription.repMin !== undefined && prescription.repMax !== undefined
      ? trackingType === 'time'
        ? `duración ${formatCardioDuration(prescription.repMin)}-${formatCardioDuration(prescription.repMax)}`
        : `${prescription.repMin}-${prescription.repMax} reps`
      : null;
  const rest =
    prescription.restMinSeconds !== undefined && prescription.restMaxSeconds !== undefined
      ? (() => {
          const restMin = formatRestDuration(prescription.restMinSeconds);
          const restMax = formatRestDuration(prescription.restMaxSeconds);
          return `descanso ${restMin === restMax ? restMin : `${restMin}-${restMax}`}`;
        })()
      : null;
  return [reps, rest].filter(Boolean).join(' · ');
};

const formatRestDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const RoutineUpdatePrompt: React.FC<{
  onAccept: () => void;
  onDecline: () => void;
}> = ({ onAccept, onDecline }) => (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(2,8,15,0.72)] p-4 backdrop-blur-sm"
    onClick={onDecline}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="routine-update-title"
      className="relative w-full max-w-md rounded-3xl border border-[rgba(73,133,214,0.16)] bg-[#0b1724] p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Cerrar actualización de rutina"
        onClick={onDecline}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
      <h2 id="routine-update-title" className="pr-10 text-xl font-bold text-white">
        Actualizar rutina original
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        ¿Quieres copiar la configuración final de ejercicios a esta rutina?
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300"
        >
          No, mantener
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-2xl bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-4 py-3 font-bold text-white"
        >
          Sí, actualizar
        </button>
      </div>
    </div>
  </div>
);

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
    persistedUserId,
    loadActiveWorkout,
    startWorkout,
    startEmptyWorkout,
    addActiveWorkoutExercise,
    updateActiveWorkoutExerciseNotes,
    updateActiveWorkoutExerciseRest,
    setActiveExerciseSuperset,
    removeActiveWorkoutExercise,
    reorderActiveWorkoutExercises,
    updateWorkoutExerciseSets,
    setActiveWorkoutPosition,
    startRestTimer,
    clearRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    extendRestTimer,
    finishWorkout,
    updateRoutineFromWorkout,
    cancelWorkout,
  } = useStore();

  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [startupResolved, setStartupResolved] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingRoutineUpdate, setPendingRoutineUpdate] = useState<RoutineUpdateCandidate | null>(
    null
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [supersetPickerFor, setSupersetPickerFor] = useState<string | null>(null);
  const startupPromiseRef = React.useRef<{
    userId: string;
    promise: Promise<[LoadResult | void, LoadResult | void]>;
  } | null>(null);
  const initializationConsumedRef = React.useRef(false);
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
    let cancelled = false;
    if (!persistedUserId) return;

    if (startupPromiseRef.current?.userId !== persistedUserId) {
      const context = {
        userId: persistedUserId,
        isCurrent: () => useStore.getState().persistedUserId === persistedUserId,
      };
      startupPromiseRef.current = {
        userId: persistedUserId,
        promise: Promise.resolve().then(() =>
          Promise.all([loadRoutines(context), loadActiveWorkout(context)])
        ),
      };
    }
    void startupPromiseRef.current.promise.then(
      (results) => {
        if (cancelled) return;
        if (results.every((result) => result?.ok === true)) {
          setStartupResolved(true);
        } else {
          setInitializationError('No se pudo cargar el entrenamiento.');
        }
      },
      () => {
        if (!cancelled) {
          setInitializationError('No se pudo cargar el entrenamiento.');
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [persistedUserId, loadRoutines, loadActiveWorkout]);

  // Keep the screen awake during the workout (gym QoL — no more screen sleeping
  // between sets). The lock auto-releases when the page is hidden, so re-acquire
  // when it becomes visible again.
  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<typeof wakeLock> };
        };
        if (nav.wakeLock) wakeLock = await nav.wakeLock.request('screen');
      } catch {
        // ignore (unsupported / not allowed)
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        void wakeLock?.release();
      } catch {
        // ignore
      }
      wakeLock = null;
    };
  }, []);

  useEffect(() => {
    if (workoutHistory.length === 0) {
      loadWorkoutHistory();
    }
  }, [workoutHistory.length, loadWorkoutHistory]);

  useEffect(() => {
    let cancelled = false;

    const initSession = async () => {
      if (!startupResolved || initializationConsumedRef.current) return;

      // The static route /routine/free/workout has no :id param,
      // so id will be undefined. Detect both cases.
      // Use location.pathname (from useLocation) instead of window.location.pathname
      // because the app uses HashRouter.
      const isFreeRoute = id === 'free' || (!id && location.pathname.includes('/free/'));

      // Consume initialization before accepting restoration or starting. A later
      // terminal clear on this mount must never re-arm startup.
      initializationConsumedRef.current = true;
      if (activeWorkout) return;

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
          navigate('/routine');
        }
      } else {
        navigate('/routine');
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
    startupResolved,
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

    const currentSet = exercise.sets[setIndex];
    const isCompleting = !currentSet.completed; // about to flip to completed

    if (!isCompleting) {
      // Un-completing: just keep focus here, no rest, no advance.
      void setActiveWorkoutPosition(exerciseId, setIndex);
      return;
    }

    // Superset/circuit: when completing a set of a non-last member, jump to the
    // next exercise of the group (same round) instead of resting. Rest only runs
    // after the last member of the group.
    if (exercise.supersetId) {
      const group = activeWorkout.exercises.filter(
        (ex) => ex && ex.supersetId === exercise.supersetId
      );
      const posInGroup = group.findIndex((ex) => ex.exerciseId === exerciseId);
      const nextMember = group[posInGroup + 1];
      if (nextMember) {
        void setActiveWorkoutPosition(nextMember.exerciseId, setIndex);
        return;
      }
    }

    void setActiveWorkoutPosition(exerciseId, setIndex);

    // Start rest timer (skip if the set has dropsets — no rest between sub-series).
    const hasDropsets = currentSet.dropsets && currentSet.dropsets.length > 0;
    const restSeconds = exercise.restSeconds || 0;
    if (restSeconds > 0 && !hasDropsets) {
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

  const updateCardioMetric = (
    exerciseId: string,
    field: CardioMetricKey,
    value: number | undefined
  ) => {
    if (!activeWorkout) return;
    const exercise = activeWorkout.exercises.find((ex) => ex && ex.exerciseId === exerciseId);
    if (!exercise || exercise.sets.length === 0) return;

    const setIndex = exercise.sets.findIndex((set) => !set.isWarmup);
    const targetIndex = setIndex >= 0 ? setIndex : 0;
    const targetSet = exercise.sets[targetIndex];
    const metrics = sanitizeCardioMetrics({
      ...(targetSet.cardioMetrics || {}),
      [field]: value,
    });
    const updatedSets = exercise.sets.map((set, index) => {
      if (index !== targetIndex) return set;
      return {
        ...set,
        ...(metrics ? { cardioMetrics: metrics } : { cardioMetrics: undefined }),
        ...(field === 'durationSeconds' ? { reps: value ?? 0 } : {}),
      };
    });
    void updateWorkoutExerciseSets(exerciseId, updatedSets);
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

  const acceptRoutineUpdate = async () => {
    const candidate = pendingRoutineUpdate;
    if (!candidate) return;
    try {
      const updated = await updateRoutineFromWorkout(candidate);
      if (!updated) return;
      setPendingRoutineUpdate(null);
      navigate('/dashboard');
    } catch {
      // Keep the originating candidate available so the user can retry.
    }
  };

  const declineRoutineUpdate = () => {
    setPendingRoutineUpdate(null);
    navigate('/dashboard');
  };

  const routineUpdatePrompt = pendingRoutineUpdate ? (
    <RoutineUpdatePrompt
      onAccept={() => void acceptRoutineUpdate()}
      onDecline={declineRoutineUpdate}
    />
  ) : null;

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
      <>
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
        {routineUpdatePrompt}
      </>
    );
  }

  const safeExercises = Array.isArray(activeWorkout.exercises)
    ? activeWorkout.exercises.filter(
        (ex): ex is (typeof activeWorkout.exercises)[number] => !!ex && typeof ex.name === 'string'
      )
    : [];

  const supersetBadges: Record<string, string> = {};
  let supersetLetterIdx = 0;
  safeExercises.forEach((ex) => {
    if (ex.supersetId && !supersetBadges[ex.supersetId]) {
      supersetBadges[ex.supersetId] = String.fromCharCode(65 + supersetLetterIdx);
      supersetLetterIdx += 1;
    }
  });

  const getWorkingSets = (exercise: ActiveWorkoutExercise) =>
    exercise.sets.filter((set) => !set.isWarmup);
  const totalSets = safeExercises.reduce((acc, ex) => acc + getWorkingSets(ex).length, 0);
  const completedSets = safeExercises.reduce(
    (acc, ex) => acc + getWorkingSets(ex).filter((s) => s.completed).length,
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const assignSupersetLive = (partnerId: string) => {
    const aId = supersetPickerFor;
    if (!aId || aId === partnerId) {
      setSupersetPickerFor(null);
      return;
    }
    const exs = activeWorkout?.exercises || [];
    const a = exs.find((e) => e.exerciseId === aId);
    const b = exs.find((e) => e.exerciseId === partnerId);
    const gid = a?.supersetId || b?.supersetId || createId('ss');
    void setActiveExerciseSuperset(aId, gid);
    void setActiveExerciseSuperset(partnerId, gid);
    setSupersetPickerFor(null);
  };

  const clearSupersetLive = (exId: string) => {
    const exs = activeWorkout?.exercises || [];
    const gid = exs.find((e) => e.exerciseId === exId)?.supersetId;
    void setActiveExerciseSuperset(exId, null);
    if (gid) {
      const remaining = exs.filter((e) => e.supersetId === gid && e.exerciseId !== exId);
      if (remaining.length === 1) void setActiveExerciseSuperset(remaining[0].exerciseId, null);
    }
  };
  const isPartial = totalSets > 0 && completedSets < totalSets;
  const isFreeWorkout = !activeWorkout.routineId;

  const handleFinish = () => {
    setFinishConfirmOpen(true);
  };

  const confirmFinish = async () => {
    setFinishConfirmOpen(false);
    const result = await finishWorkout();
    if (!result.ok) return;
    if (result.routineUpdate) {
      setPendingRoutineUpdate(result.routineUpdate);
      return;
    }
    navigate('/dashboard');
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

  const moveExercise = (exerciseIndex: number, direction: -1 | 1) => {
    const targetIndex = exerciseIndex + direction;
    const activeExercise = safeExercises[exerciseIndex];
    const targetExercise = safeExercises[targetIndex];
    if (!activeExercise || !targetExercise) return;
    void reorderActiveWorkoutExercises(activeExercise.exerciseId, targetExercise.exerciseId);
  };

  const contentReservation = getWorkoutContentReservation(Boolean(activeWorkout.restTimer));
  const contentBottomPaddingClass =
    contentReservation.mobileBaseRem === 19
      ? 'pb-[calc(19rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] lg:pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]'
      : 'pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]';

  return (
    <div className="h-full w-full flex overflow-hidden bg-[linear-gradient(180deg,#08111d_0%,#06101a_40%,#040b13_100%)]">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        <div
          data-testid="workout-scroll-content"
          className={`flex flex-col max-w-3xl mx-auto ${contentBottomPaddingClass}`}
        >
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
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-4 py-3.5 font-bold text-white transition-all active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Añadir ejercicio
                  </button>
                </div>
              </div>
            )}

            {safeExercises.map((exercise, exIndex) => (
              <div
                key={exercise.exerciseId}
                data-exercise-card={exercise.exerciseId}
                className={`mobile-card overflow-hidden shadow-sm ${
                  exercise.supersetId ? 'border-l-4 border-l-violet-500' : ''
                }`}
              >
                {/* Exercise Header */}
                <div
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-[rgba(47,140,255,0.05)]"
                  onClick={() => {
                    const nextExpanded =
                      expandedExercise === exercise.exerciseId ? null : exercise.exerciseId;
                    setExpandedExercise(nextExpanded);
                    if (nextExpanded) {
                      void setActiveWorkoutPosition(exercise.exerciseId, 0);
                    }
                  }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500">#{exIndex + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {exercise.primaryMuscle}
                        </span>
                        {exercise.supersetId && supersetBadges[exercise.supersetId] && (
                          <span
                            className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs font-bold text-violet-300"
                            title="Superserie"
                          >
                            SS {supersetBadges[exercise.supersetId]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold">{exercise.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {getWorkingSets(exercise).filter((s) => s.completed).length}/
                        {getWorkingSets(exercise).length} series completadas
                      </p>
                    </div>
                    <div className="flex items-center self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={exIndex === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveExercise(exIndex, -1);
                        }}
                        aria-label={`Mover ${exercise.name} arriba`}
                        title="Mover ejercicio arriba"
                        className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        disabled={exIndex === safeExercises.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveExercise(exIndex, 1);
                        }}
                        aria-label={`Mover ${exercise.name} abajo`}
                        title="Mover ejercicio abajo"
                        className="flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          arrow_downward
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeActiveWorkoutExercise(exercise.exerciseId);
                        }}
                        aria-label={`Eliminar ${exercise.name}`}
                        title="Eliminar ejercicio"
                        className="flex size-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (exercise.supersetId) {
                            clearSupersetLive(exercise.exerciseId);
                          } else {
                            setSupersetPickerFor(exercise.exerciseId);
                          }
                        }}
                        className={`p-2 transition-colors ${
                          exercise.supersetId
                            ? 'text-violet-400'
                            : 'text-slate-500 hover:text-white'
                        }`}
                        title={exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'}
                        aria-label={
                          exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'
                        }
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {exercise.supersetId ? 'link_off' : 'link'}
                        </span>
                      </button>
                      <button className="p-2">
                        <span className="material-symbols-outlined text-slate-500">
                          {expandedExercise === exercise.exerciseId ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sets (collapsible) */}
                {expandedExercise === exercise.exerciseId && (
                  <div className="border-t border-[rgba(73,133,214,0.12)] bg-[rgba(10,20,34,0.72)] p-3">
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
                          inputMode="numeric"
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

                    {formatPrescription(exercise.prescription, exercise.trackingType) && (
                      <div
                        data-testid={`exercise-prescription-${exercise.exerciseId}`}
                        className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-blue-100"
                      >
                        <span className="font-bold text-primary">Objetivo:</span>{' '}
                        {formatPrescription(exercise.prescription, exercise.trackingType)}
                      </div>
                    )}

                    {isCardioExercise({
                      activityType: exercise.activityType,
                      trackingType: exercise.trackingType,
                      primaryMuscle: exercise.primaryMuscle,
                    }) && (
                      <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-cyan-100">Datos de cardio</h4>
                          <span className="text-xs text-slate-400">
                            {exercise.cardioTargets?.modality || 'sesión'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {CARDIO_INPUTS.map(({ key, label, unit, step }) => {
                            const cardioSet = getWorkingSets(exercise)[0] || exercise.sets[0];
                            const metrics = cardioSet?.cardioMetrics;
                            const fallbackDuration =
                              key === 'durationSeconds' ? cardioSet?.reps : undefined;
                            const value = metrics?.[key] ?? fallbackDuration ?? '';
                            return (
                              <label key={key} className="flex min-w-0 flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                  {label}
                                </span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    aria-label={label}
                                    min={0}
                                    max={key === 'rpe' ? 10 : undefined}
                                    step={step || '1'}
                                    value={value}
                                    onChange={(event) => {
                                      const raw = event.target.value;
                                      const parsed = raw === '' ? undefined : Number(raw);
                                      if (parsed === undefined || Number.isFinite(parsed)) {
                                        updateCardioMetric(exercise.exerciseId, key, parsed);
                                      }
                                    }}
                                    className="w-full min-w-0 rounded-lg border border-white/10 bg-[#07131d] px-2 py-1.5 text-center text-sm font-bold text-white"
                                  />
                                  <span className="shrink-0 text-[10px] text-slate-500">
                                    {unit}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {(() => {
                          const cardioSet = getWorkingSets(exercise)[0] || exercise.sets[0];
                          const metrics = cardioSet?.cardioMetrics;
                          const duration = metrics?.durationSeconds ?? cardioSet?.reps;
                          const pace =
                            metrics?.paceSecondsPerKm ??
                            (duration && metrics?.distanceKm
                              ? duration / metrics.distanceKm
                              : undefined);
                          return (
                            <p className="mt-2 text-xs text-slate-400">
                              Resumen: {formatCardioDuration(duration)}
                              {metrics?.distanceKm ? ` · ${metrics.distanceKm.toFixed(2)} km` : ''}
                              {pace ? ` · ${formatPace(pace)}` : ''}
                            </p>
                          );
                        })()}
                      </div>
                    )}

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
                            const previousWorkingSets = lastExercise?.sets?.filter(
                              (previousSet) => !previousSet.isWarmup
                            );
                            const workingSetIndex = exercise.sets
                              .slice(0, setIndex)
                              .filter((currentSet) => !currentSet.isWarmup).length;
                            const lastSet = set.isWarmup
                              ? undefined
                              : previousWorkingSets?.[workingSetIndex];
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
                                lastSet={lastSet}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>

                      {/* Add Set Button */}
                      <button
                        onClick={() => addSet(exercise.exerciseId)}
                        className="rounded-2xl border-2 border-dashed border-white/10 py-3 text-sm font-bold text-slate-400 transition-colors hover:border-primary hover:text-white active:scale-[0.99]"
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
          <div className="lg:hidden fixed bottom-[var(--keyboard-inset,0px)] left-0 right-0 z-30 border-t border-[rgba(73,133,214,0.12)] bg-[rgba(6,14,24,0.94)] p-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
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

              {/* Finish Button (primary, full-width, large touch target) */}
              <button
                onClick={handleFinish}
                className="w-full rounded-xl bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] py-4 text-base font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.99]"
              >
                {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
              </button>

              {/* Cancel (de-emphasised to avoid accidental taps mid-workout) */}
              <button
                onClick={() => setCancelConfirmOpen(true)}
                className="w-full py-2 text-sm font-semibold text-red-400/80 transition-colors hover:text-red-400"
              >
                Cancelar entrenamiento
              </button>
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

      {/* Superset partner picker (live workout) */}
      {supersetPickerFor && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setSupersetPickerFor(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0b1724] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-lg font-bold text-white">Añadir a superserie</h3>
            <p className="mb-4 text-sm text-slate-400">Elige el ejercicio con el que emparejarlo</p>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {safeExercises
                .filter((e) => e.exerciseId !== supersetPickerFor)
                .map((e) => (
                  <button
                    key={e.exerciseId}
                    onClick={() => assignSupersetLive(e.exerciseId)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                  >
                    <span className="font-semibold">{e.name}</span>
                    {e.supersetId && supersetBadges[e.supersetId] && (
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs font-bold text-violet-300">
                        SS {supersetBadges[e.supersetId]}
                      </span>
                    )}
                  </button>
                ))}
              {safeExercises.filter((e) => e.exerciseId !== supersetPickerFor).length === 0 && (
                <p className="text-sm text-slate-500">Añade otro ejercicio primero.</p>
              )}
            </div>
            <button
              onClick={() => setSupersetPickerFor(null)}
              className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {routineUpdatePrompt}
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
  lastSet?: { reps?: number; weight?: number };
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
  lastSet,
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
          ? 'border-green-500/60 bg-green-500/10'
          : isCurrentSet
            ? 'border-amber-400 bg-amber-400/10'
            : set.isWarmup
              ? 'border-teal-400/20 bg-teal-400/10 opacity-80'
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
            aria-label={set.completed ? 'Marcar serie como no completada' : 'Completar serie'}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-95 ${
              set.completed ? 'border-green-500 bg-green-500' : 'border-white/15'
            }`}
          >
            {set.completed && (
              <span className="material-symbols-outlined text-white text-[24px]">check</span>
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
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500 text-white"
              title="Calentamiento"
            >
              W
            </span>
          )}
          {set.isFailure && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white"
              title="Al fallo"
            >
              F
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
                placeholder={lastSet?.weight != null ? String(lastSet.weight) : undefined}
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
                className="w-full min-w-[64px] rounded-xl border border-white/10 bg-[#07131d] px-2 py-1.5 text-center text-sm font-bold text-white sm:w-20"
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
              placeholder={lastSet?.reps != null ? String(lastSet.reps) : undefined}
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
            aria-label="Eliminar serie"
            className="flex size-10 shrink-0 items-center justify-center self-start rounded-lg transition-colors hover:bg-red-500/10 active:scale-95 sm:ml-auto sm:self-center"
          >
            <span className="material-symbols-outlined text-red-500 text-[20px]">close</span>
          </button>
        )}
      </div>

      {lastSet && (lastSet.weight != null || lastSet.reps != null) ? (
        <button
          type="button"
          onClick={() => {
            if (lastSet.weight != null)
              updateSetValue(exerciseId, setIndex, 'weight', lastSet.weight);
            if (lastSet.reps != null) updateSetValue(exerciseId, setIndex, 'reps', lastSet.reps);
          }}
          className="mt-1 ml-10 text-left text-xs text-slate-400 transition-colors hover:text-primary active:text-primary"
        >
          {lastLabel} · usar
        </button>
      ) : (
        <p className="mt-1 ml-10 text-xs text-slate-500">{lastLabel}</p>
      )}

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
                  type="text"
                  inputMode="decimal"
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
                  type="text"
                  inputMode="numeric"
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
