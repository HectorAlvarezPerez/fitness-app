export type PersistedRestTimer = {
  exerciseId: string;
  setIndex: number;
  durationSeconds: number;
  startedAt: string;
  pausedAt?: string;
  pausedElapsedSeconds?: number;
  instanceId: string;
};

type ActiveWorkoutLike = {
  exercises: any[];
  currentExerciseId?: string;
  currentSetIndex?: number;
  restTimer?: PersistedRestTimer | null;
  overrideDate?: string;
};

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

export const getActiveWorkoutPath = (routineId?: string | null) =>
  routineId ? `/routine/${routineId}/workout` : '/routine/free/workout';

export const buildActiveWorkoutDataPayload = (activeWorkout: ActiveWorkoutLike) => ({
  exercises: Array.isArray(activeWorkout.exercises) ? activeWorkout.exercises : [],
  current_exercise_id: activeWorkout.currentExerciseId || null,
  current_set_index:
    typeof activeWorkout.currentSetIndex === 'number' ? activeWorkout.currentSetIndex : null,
  rest_timer: activeWorkout.restTimer || null,
  override_date: activeWorkout.overrideDate || null,
});

export const readActiveWorkoutDataPayload = (workoutData: unknown) => {
  if (!isObject(workoutData)) {
    return {
      exercises: [] as any[],
      currentExerciseId: undefined as string | undefined,
      currentSetIndex: undefined as number | undefined,
      restTimer: null as PersistedRestTimer | null,
    };
  }

  const rawExercises = Array.isArray(workoutData.exercises) ? workoutData.exercises : [];
  const currentExerciseId =
    typeof workoutData.current_exercise_id === 'string' ? workoutData.current_exercise_id : undefined;
  const currentSetIndex =
    typeof workoutData.current_set_index === 'number' ? workoutData.current_set_index : undefined;

  let restTimer: PersistedRestTimer | null = null;
  const rawRestTimer = workoutData.rest_timer;
  if (
    isObject(rawRestTimer) &&
    typeof rawRestTimer.exerciseId === 'string' &&
    typeof rawRestTimer.setIndex === 'number' &&
    typeof rawRestTimer.durationSeconds === 'number' &&
    typeof rawRestTimer.startedAt === 'string' &&
    typeof rawRestTimer.instanceId === 'string'
  ) {
    restTimer = {
      exerciseId: rawRestTimer.exerciseId,
      setIndex: rawRestTimer.setIndex,
      durationSeconds: rawRestTimer.durationSeconds,
      startedAt: rawRestTimer.startedAt,
      pausedAt: typeof rawRestTimer.pausedAt === 'string' ? rawRestTimer.pausedAt : undefined,
      pausedElapsedSeconds:
        typeof rawRestTimer.pausedElapsedSeconds === 'number'
          ? rawRestTimer.pausedElapsedSeconds
          : undefined,
      instanceId: rawRestTimer.instanceId,
    };
  }

  const overrideDate =
    typeof workoutData.override_date === 'string' ? workoutData.override_date : undefined;

  return {
    exercises: rawExercises,
    currentExerciseId,
    currentSetIndex,
    restTimer,
    overrideDate,
  };
};

