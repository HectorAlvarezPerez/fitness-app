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
  cardioDurationMinutesToSeconds,
  cardioDurationSecondsToMinutes,
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
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet';

export const getWorkoutContentReservation = (hasRestTimer: boolean) => ({
  mobileBaseRem: hasRestTimer ? (19 as const) : (9 as const),
  desktopBaseRem: 9 as const,
  includesSafeAreaInset: true as const,
  includesKeyboardInset: true as const,
});

const SortableWorkoutExercise: React.FC<{
  exercise: ActiveWorkoutExercise;
  children: (handle: ReturnType<typeof useSortable>) => React.ReactNode;
}> = ({ exercise, children }) => {
  const sortable = useSortable({ id: exercise.exerciseId });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      data-exercise-card={exercise.exerciseId}
      className={`mobile-card overflow-hidden shadow-sm ${exercise.supersetId ? 'border-l-4 border-l-violet-500' : ''} ${sortable.isDragging ? 'relative z-20' : ''}`}
    >
      {children(sortable)}
    </div>
  );
};

const CARDIO_INPUTS: Array<{
  key: CardioMetricKey;
  label: string;
  unit: string;
  step?: string;
}> = [
  { key: 'durationSeconds', label: 'Duración', unit: 'min' },
  { key: 'distanceKm', label: 'Distancia', unit: 'km', step: '0.01' },
  { key: 'paceSecondsPerKm', label: 'Ritmo', unit: 'seg/km' },
  { key: 'averageHeartRateBpm', label: 'FC media', unit: 'ppm' },
  { key: 'maxHeartRateBpm', label: 'FC máxima', unit: 'ppm' },
  { key: 'cadenceRpm', label: 'Cadencia', unit: 'rpm' },
  { key: 'calories', label: 'Calorías', unit: 'kcal' },
  { key: 'rpe', label: 'RPE', unit: '0-10', step: '0.5' },
];

const CardioDurationInput: React.FC<{
  seconds: number | undefined;
  onChange: (seconds: number | undefined) => void;
  label: string;
  className: string;
}> = ({ seconds, onChange, label, className }) => {
  const [draft, setDraft] = useState(() => {
    const minutes = cardioDurationSecondsToMinutes(seconds);
    return minutes === undefined ? '' : String(minutes);
  });
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (isFocused) return;
    const minutes = cardioDurationSecondsToMinutes(seconds);
    setDraft(minutes === undefined ? '' : String(minutes));
  }, [seconds, isFocused]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onChange={(event) => {
        const raw = event.target.value;
        if (!/^\d*([.,]\d*)?$/.test(raw)) return;
        setDraft(raw);
        if (raw === '') {
          onChange(undefined);
          return;
        }
        const minutes = parseLocaleDecimal(raw);
        if (minutes !== null && minutes >= 0) {
          onChange(cardioDurationMinutesToSeconds(minutes));
        }
      }}
      className={className}
    />
  );
};

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
  <Dialog open onOpenChange={(open) => !open && onDecline()}>
    <DialogContent className="max-w-md p-6" closeLabel="Cerrar actualización de rutina">
      <DialogHeader>
        <DialogTitle>Actualizar rutina original</DialogTitle>
        <DialogDescription>
          ¿Quieres copiar la configuración final de ejercicios a esta rutina?
        </DialogDescription>
      </DialogHeader>
      <div className="mt-2 flex gap-3">
        <Button type="button" variant="outline" onClick={onDecline} className="flex-1">
          No, mantener
        </Button>
        <Button type="button" onClick={onAccept} className="flex-1">
          Sí, actualizar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
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
  const exerciseSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

    const isCardioTime =
      exercise.trackingType === 'time' &&
      isCardioExercise({
        activityType: exercise.activityType,
        trackingType: exercise.trackingType,
        primaryMuscle: exercise.primaryMuscle,
      });
    const updatedSets = exercise.sets.map((set, idx) => {
      if (idx !== setIndex) return set;
      const syncCardioDuration = field === 'reps' && isCardioTime;
      const cardioMetrics = syncCardioDuration
        ? sanitizeCardioMetrics({ ...set.cardioMetrics, durationSeconds: value })
        : undefined;
      return {
        ...set,
        [field]: syncCardioDuration ? (cardioMetrics?.durationSeconds ?? 0) : value,
        ...(syncCardioDuration ? { cardioMetrics } : {}),
      };
    });

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
        ...(field === 'durationSeconds' && exercise.trackingType === 'time'
          ? { reps: metrics?.durationSeconds ?? 0 }
          : {}),
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
            <span className="material-symbols-outlined text-3xl text-red-600">error</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Error</h2>
          <p className="text-slate-600">{initializationError}</p>
          <Button variant="ghost"
            onClick={() => navigate('/routine')}
            className="rounded-full bg-primary px-6 py-3 font-semibold text-white"
          >
            Volver a Rutinas
          </Button>
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
            <p className="text-slate-600">Cargando entrenamiento...</p>
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

  const handleExerciseDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    if (!safeExercises.some((exercise) => exercise.exerciseId === active.id) ||
        !safeExercises.some((exercise) => exercise.exerciseId === over.id)) return;
    void reorderActiveWorkoutExercises(String(active.id), String(over.id));
  };

  const contentReservation = getWorkoutContentReservation(Boolean(activeWorkout.restTimer));
  const contentBottomPaddingClass =
    contentReservation.mobileBaseRem === 19
      ? 'pb-[calc(19rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] lg:pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]'
      : 'pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]';

  return (
    <div className="h-full w-full flex overflow-hidden bg-slate-50">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        <div
          data-testid="workout-scroll-content"
          className={`flex flex-col max-w-3xl mx-auto ${contentBottomPaddingClass}`}
        >
          {/* Header (Mobile Only for Sidebar items) */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-xl lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <Link
                to="/routine"
                className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-slate-900"
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
              <h1 className="text-2xl md:text-3xl font-black mb-2 text-slate-900">{activeWorkout.routineName}</h1>
              {activeWorkout.overrideDate && (
                <div className="mb-2 flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/12 px-3 py-1.5 text-sm font-medium text-amber-800">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  Registrando entrenamiento del{' '}
                  {new Date(activeWorkout.overrideDate + 'T12:00:00').toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
              )}
              <Button variant="default"
                type="button"
                aria-label="Añadir ejercicio"
                onClick={() => setIsLibraryOpen(true)}
                className="shrink-0 rounded-full px-3"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span className="hidden sm:inline">Añadir</span>
              </Button>
            </div>

            {/* Mobile Progress Bar */}
            <div className="lg:hidden flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-600 whitespace-nowrap">
                {completedSets}/{totalSets}
              </span>
            </div>
          </div>

          {/* Exercises */}
          <div className="p-4 lg:p-6 flex flex-col gap-4">
            {safeExercises.length === 0 && (
              <div className="mobile-card border-dashed p-6 text-center text-slate-600">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-primary">
                    playlist_add
                  </span>
                  <div>
                    <p className="font-semibold">Rutina libre vacía</p>
                    <p className="text-sm">Añade ejercicios para empezar tu sesión.</p>
                  </div>
                  <Button variant="default"
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="w-full rounded-2xl px-4 py-3.5 active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Añadir ejercicio
                  </Button>
                </div>
              </div>
            )}

            <DndContext sensors={exerciseSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
              <SortableContext items={safeExercises.map((exercise) => exercise.exerciseId)} strategy={verticalListSortingStrategy}>
            {safeExercises.map((exercise, exIndex) => (
              <SortableWorkoutExercise
                key={exercise.exerciseId}
                exercise={exercise}
              >
                {({ attributes, listeners, isDragging }) => <>
                {/* Exercise Header */}
                <div
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-blue-50"
                  onClick={() => {
                    if (isDragging) return;
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
                            className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs font-bold text-violet-700"
                            title="Superserie"
                          >
                            SS {supersetBadges[exercise.supersetId]}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{exercise.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {getWorkingSets(exercise).filter((s) => s.completed).length}/
                        {getWorkingSets(exercise).length} series completadas
                      </p>
                    </div>
                    <div className="flex items-center self-end sm:self-auto">
                      <Button variant="ghost" type="button" size="icon"
                        {...attributes} {...listeners}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Arrastrar ${exercise.name}`}
                        title={`Arrastrar ${exercise.name}`}
                        className="flex size-11 touch-none cursor-grab items-center justify-center rounded-lg text-slate-500 active:cursor-grabbing"
                      >
                        <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeActiveWorkoutExercise(exercise.exerciseId);
                        }}
                        aria-label={`Eliminar ${exercise.name}`}
                        title="Eliminar ejercicio"
                        className="flex size-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-500/10 hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </Button>
                      <Button variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (exercise.supersetId) {
                            clearSupersetLive(exercise.exerciseId);
                          } else {
                            setSupersetPickerFor(exercise.exerciseId);
                          }
                        }}
                        type="button"
                        size="icon"
                        className={`transition-colors ${
                          exercise.supersetId
                            ? 'text-violet-400'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title={exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'}
                        aria-label={
                          exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'
                        }
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {exercise.supersetId ? 'link_off' : 'link'}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        size="icon"
                        aria-label={`${expandedExercise === exercise.exerciseId ? 'Contraer' : 'Expandir'} ${exercise.name}`}
                        aria-expanded={expandedExercise === exercise.exerciseId}
                      >
                        <span className="material-symbols-outlined text-slate-500">
                          {expandedExercise === exercise.exerciseId ? 'expand_less' : 'expand_more'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sets (collapsible) */}
                {expandedExercise === exercise.exerciseId && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3">
                    {/* Notes Field */}
                    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-[18px]">
                          edit_note
                        </span>
                        <Textarea
                          value={exercise.notes || ''}
                          onChange={(e) =>
                            void updateActiveWorkoutExerciseNotes(
                              exercise.exerciseId,
                              e.target.value
                            )
                          }
                          placeholder="Notas del ejercicio..."
                          rows={2}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition-all resize-none focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
                        />
                      </div>
                      <div className="relative w-full sm:w-24">
                        <span className="material-symbols-outlined absolute left-2 top-3 text-gray-400 text-[16px]">
                          timer
                        </span>
                        <Input
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
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-2 text-center text-sm text-slate-900 transition-all focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
                        />
                      </div>
                      {isFreeWorkout && (
                        <Button variant="ghost"
                          onClick={() => setExpandedExercise(null)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-slate-900"
                        >
                          Cerrar ejercicio
                        </Button>
                      )}
                    </div>

                    {formatPrescription(exercise.prescription, exercise.trackingType) && (
                      <div
                        data-testid={`exercise-prescription-${exercise.exerciseId}`}
                        className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-blue-800"
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
                          <h4 className="text-sm font-bold text-cyan-800">Datos de cardio</h4>
                          <span className="text-xs text-slate-600">
                            {exercise.cardioTargets?.modality || 'sesión'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {CARDIO_INPUTS.map(({ key, label, unit, step }) => {
                            const cardioSet = getWorkingSets(exercise)[0] || exercise.sets[0];
                            const metrics = cardioSet?.cardioMetrics;
                            const fallbackDuration =
                              key === 'durationSeconds' && exercise.trackingType === 'time'
                                ? cardioSet?.reps
                                : undefined;
                            const value = metrics?.[key] ?? fallbackDuration;
                            const seconds =
                              key === 'durationSeconds' && typeof value === 'number'
                                ? value
                                : undefined;
                            return (
                              <label key={key} className="flex min-w-0 flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase text-slate-600">
                                  {label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {key === 'durationSeconds' ? (
                                    <CardioDurationInput
                                      seconds={seconds}
                                      onChange={(nextSeconds) =>
                                        updateCardioMetric(exercise.exerciseId, key, nextSeconds)
                                      }
                                      label={label}
                                      className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-900"
                                    />
                                  ) : (
                                    <Input
                                      type="number"
                                      aria-label={label}
                                      min={0}
                                      max={key === 'rpe' ? 10 : undefined}
                                      step={step || '1'}
                                      value={value ?? ''}
                                      onChange={(event) => {
                                        const raw = event.target.value;
                                        const parsed = raw === '' ? undefined : Number(raw);
                                        if (parsed === undefined || Number.isFinite(parsed)) {
                                          updateCardioMetric(exercise.exerciseId, key, parsed);
                                        }
                                      }}
                                      className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-bold text-slate-900"
                                    />
                                  )}
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
                          const duration =
                            metrics?.durationSeconds ??
                            (exercise.trackingType === 'time' ? cardioSet?.reps : undefined);
                          const pace =
                            metrics?.paceSecondsPerKm ??
                            (duration && metrics?.distanceKm
                              ? duration / metrics.distanceKm
                              : undefined);
                          return (
                            <p className="mt-2 text-xs text-slate-600">
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
                                isCardio={isCardioExercise({
                                  activityType: exercise.activityType,
                                  trackingType: exercise.trackingType,
                                  primaryMuscle: exercise.primaryMuscle,
                                })}
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
                      <Button variant="ghost"
                        onClick={() => addSet(exercise.exerciseId)}
                        className="rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-slate-900 active:scale-[0.99]"
                      >
                        + Añadir Serie
                      </Button>
                    </div>
                  </div>
                )}
                </>}
              </SortableWorkoutExercise>
            ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Static Footer Container (Mobile Only) */}
          <div className="lg:hidden fixed bottom-[var(--keyboard-inset,0px)] left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
            <div className="w-full space-y-2">
              {/* Timer (if active) - Footer version */}
              {activeWorkout.restTimer && (
                <div className="mb-3 border-b border-slate-200 pb-3">
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
              <Button variant="ghost"
                onClick={handleFinish}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-4 text-base font-bold text-white transition-all active:scale-[0.99]"
              >
                {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
              </Button>

              {/* Cancel (de-emphasised to avoid accidental taps mid-workout) */}
              <Button variant="ghost"
                onClick={() => setCancelConfirmOpen(true)}
                className="w-full py-2 text-sm font-semibold text-red-600 transition-colors hover:text-red-600"
              >
                Cancelar entrenamiento
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex h-full w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white/95 shadow-sm z-20">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Timer Widget */}
          <div className="mobile-card p-6 shadow-sm">
            <h3 className="mb-2 text-center text-xs font-bold uppercase text-slate-600">
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
              <h3 className="text-xs font-bold uppercase text-slate-600">Progreso</h3>
              <span className="text-sm font-bold text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="mb-2 h-3 rounded-full bg-slate-100">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-600">
              {completedSets} de {totalSets} series completadas
            </p>
          </div>

          {/* Active Rest Timer Widget */}
          {activeWorkout.restTimer && (
            <div className="mobile-card border-blue-100 bg-blue-50 p-6 shadow-sm">
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
            <Button variant="ghost"
              onClick={handleFinish}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">flag</span>
              {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
            </Button>

            <Button variant="ghost"
              onClick={() => setCancelConfirmOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/8 py-3 font-bold text-red-600 transition-all hover:bg-red-500/12"
            >
              <span className="material-symbols-outlined">close</span>
              Cancelar
            </Button>
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
      <Sheet
        open={!!supersetPickerFor}
        onOpenChange={(open) => {
          if (!open) setSupersetPickerFor(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="z-[70] max-h-[85dvh] gap-4 overflow-y-auto rounded-t-3xl border-slate-200 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:left-1/2 sm:right-auto sm:w-[min(calc(100%-2rem),28rem)] sm:-translate-x-1/2 sm:rounded-3xl"
        >
            <SheetTitle className="text-lg font-bold">Añadir a superserie</SheetTitle>
            <SheetDescription>Elige el ejercicio con el que emparejarlo.</SheetDescription>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {safeExercises
                .filter((e) => e.exerciseId !== supersetPickerFor)
                .map((e) => (
                  <Button
                    variant="outline"
                    key={e.exerciseId}
                    type="button"
                    aria-label={`Emparejar con ${e.name}`}
                    onClick={() => assignSupersetLive(e.exerciseId)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <span className="font-semibold">{e.name}</span>
                    {e.supersetId && supersetBadges[e.supersetId] && (
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs font-bold text-violet-700">
                        SS {supersetBadges[e.supersetId]}
                      </span>
                    )}
                  </Button>
                ))}
              {safeExercises.filter((e) => e.exerciseId !== supersetPickerFor).length === 0 && (
                <p className="text-sm text-slate-500">Añade otro ejercicio primero.</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSupersetPickerFor(null)}
              className="w-full text-sm font-semibold"
            >
              Cancelar
            </Button>
        </SheetContent>
      </Sheet>
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
  isCardio: boolean;
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
  isCardio,
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
  const cardioTime = trackingType === 'time' && isCardio;
  const [durationDraft, setDurationDraft] = useState(() => {
    const minutes = cardioDurationSecondsToMinutes(set.reps);
    return minutes === undefined ? '' : String(minutes);
  });
  const [isDurationFocused, setIsDurationFocused] = useState(false);

  useEffect(() => {
    if (!isWeightFocused) {
      setWeightDraft(set.weight ? String(set.weight) : '');
    }
  }, [set.weight, isWeightFocused]);

  useEffect(() => {
    if (cardioTime && !isDurationFocused) {
      const minutes = cardioDurationSecondsToMinutes(set.reps);
      setDurationDraft(minutes === undefined ? '' : String(minutes));
    }
  }, [cardioTime, isDurationFocused, set.reps]);

  return (
    <div
      ref={setNodeRef}
      data-set-anchor={`${exerciseId}-${setIndex}`}
      style={style}
      className={`border-b py-1.5 transition-colors last:border-b-0 ${
        set.completed
          ? 'border-emerald-200 bg-emerald-50/40'
          : isCurrentSet
            ? 'border-blue-200 bg-blue-50/30'
            : set.isWarmup
              ? 'border-teal-100 bg-teal-50/20 opacity-80'
              : 'border-slate-200/70'
      }`}
    >
      <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          {...attributes}
          {...listeners}
          className="h-11 min-h-11 w-6 shrink-0 p-0 text-slate-500 transition-colors hover:text-slate-900 cursor-grab touch-none active:cursor-grabbing sm:w-9"
          title="Arrastrar serie"
          aria-label="Arrastrar serie"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </Button>

        <div className="flex min-w-0 shrink-0 items-center gap-0.5">
          <span className="min-w-6 whitespace-nowrap text-center text-xs font-bold text-slate-600">
            S{setIndex + 1}
          </span>
          {set.dropsets && set.dropsets.length > 0 && (
            <span
              className="rounded bg-orange-500 px-1 text-[9px] font-bold text-white"
              title={`Dropset con ${set.dropsets.length} sub-series`}
            >
              D+{set.dropsets.length}
            </span>
          )}
          {set.isWarmup && (
            <span
              className="rounded bg-teal-600 px-1 text-[9px] font-bold text-white"
              title="Calentamiento"
            >
              W
            </span>
          )}
          {set.isFailure && (
            <span
              className="rounded bg-red-600 px-1 text-[9px] font-bold text-white"
              title="Al fallo"
            >
              F
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1">
          {/* Repetitions or duration */}
          <div className="relative min-w-[46px] flex-1">
            <Input
              type="text"
              inputMode={cardioTime ? 'decimal' : 'numeric'}
              aria-label={
                trackingType === 'time'
                  ? cardioTime
                    ? 'Duración de serie'
                    : 'Duración en segundos'
                  : `Repeticiones, serie ${setIndex + 1}`
              }
              value={cardioTime ? durationDraft : set.reps ? String(set.reps) : ''}
              placeholder={
                lastSet?.reps != null
                  ? cardioTime
                    ? String(cardioDurationSecondsToMinutes(lastSet.reps) ?? '')
                    : String(lastSet.reps)
                  : undefined
              }
              onFocus={() => cardioTime && setIsDurationFocused(true)}
              onBlur={() => cardioTime && setIsDurationFocused(false)}
              onChange={(e) => {
                const raw = e.target.value;
                if (cardioTime) {
                  if (!/^\d*([.,]\d*)?$/.test(raw)) return;
                  setDurationDraft(raw);
                  if (raw === '') {
                    updateSetValue(exerciseId, setIndex, 'reps', 0);
                    return;
                  }
                  const minutes = parseLocaleDecimal(raw);
                  if (minutes !== null && minutes >= 0) {
                    updateSetValue(
                      exerciseId,
                      setIndex,
                      'reps',
                      cardioDurationMinutesToSeconds(minutes) ?? 0
                    );
                  }
                  return;
                }
                if (!/^[0-9]*$/.test(raw)) return;
                updateSetValue(exerciseId, setIndex, 'reps', raw === '' ? 0 : parseInt(raw, 10));
              }}
              className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-blue-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[8px] text-slate-500">
              {trackingType === 'time' ? (isCardio ? 'min' : 'seg') : 'rep'}
            </span>
          </div>

          {/* Weight - hidden for time-based exercises */}
          {trackingType !== 'time' && (
            <div className="relative min-w-[46px] flex-1 border-l border-slate-200/70 pl-1">
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`Peso en kg, serie ${setIndex + 1}`}
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
                className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-blue-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[9px] text-slate-500">
                kg
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => toggleSetComplete(exerciseId, setIndex)}
          aria-label={set.completed ? 'Marcar serie como no completada' : 'Completar serie'}
          className={`size-7 min-h-7 min-w-7 shrink-0 rounded-[6px] p-0 transition-all active:scale-95 ${
            set.completed ? 'border border-green-500 bg-green-500' : 'border border-slate-300'
          }`}
        >
          {set.completed && (
            <span className="material-symbols-outlined text-white text-[18px]">check</span>
          )}
        </Button>

        {totalSets > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeSet(exerciseId, setIndex)}
            aria-label="Eliminar serie"
            className="h-11 min-h-11 w-6 shrink-0 rounded-lg p-0 text-red-600 transition-colors hover:bg-red-50 active:scale-95 sm:w-9"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </Button>
        )}
      </div>

      {lastSet && (lastSet.weight != null || lastSet.reps != null) ? (
        <Button variant="ghost"
          type="button"
          onClick={() => {
            if (lastSet.weight != null)
              updateSetValue(exerciseId, setIndex, 'weight', lastSet.weight);
            if (lastSet.reps != null) updateSetValue(exerciseId, setIndex, 'reps', lastSet.reps);
          }}
          className="mt-1 ml-10 text-left text-xs text-slate-600 transition-colors hover:text-primary active:text-primary"
        >
          {lastLabel} · usar
        </Button>
      ) : (
        <p className="mt-1 ml-10 text-xs text-slate-500">{lastLabel}</p>
      )}

      {/* Dropset sub-series */}
      {set.dropsets && set.dropsets.length > 0 && (
        <div className="ml-6 mt-1 space-y-1">
          {set.dropsets.map((dropset: any, dIndex: number) => (
            <div
              key={`${setIndex}-${dIndex}`}
              className="flex min-w-0 items-center gap-2 border-b border-l-2 border-orange-200 bg-orange-50/40 py-1 pl-2 last:border-b-0"
            >
              <span className="text-xs font-bold text-orange-700 w-8">
                {setIndex + 1}.{dIndex + 1}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">
                D
              </span>
              <div className="flex items-center gap-1">
                <Input
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
                  className="h-11 min-h-11 w-12 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-1 text-center text-sm font-semibold text-slate-900 shadow-none outline-none focus:border-b-2 focus:border-orange-600 focus:ring-0 focus-visible:border-b-2 focus-visible:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <span className="text-xs text-slate-500">kg</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
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
                  className="h-11 min-h-11 w-12 rounded-none border-0 border-b border-transparent bg-transparent px-1 py-1 text-center text-sm font-semibold text-slate-900 shadow-none outline-none focus:border-b-2 focus:border-orange-600 focus:ring-0 focus-visible:border-b-2 focus-visible:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"
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
