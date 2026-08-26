import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  supabase,
  getCachedAuth,
  SUPABASE_REST_URL,
  SUPABASE_ANON_KEY,
} from '../lib/supabaseClient';
import { createId } from '../lib/id';

import {
  buildActiveWorkoutDataPayload,
  PersistedRestTimer,
  readActiveWorkoutDataPayload,
} from '../lib/activeWorkout';
import { getRestTimerElapsedSeconds } from '../lib/restTimer';
import { scheduleRestPush, cancelRestPush } from '../lib/push';
import { getActivityTypeFromLibraryExercise, type CardioMetrics } from '../lib/trainingMetrics';
import { TRAINING_PLAN_FOLDER_NAME, buildTrainingPlanRoutines } from '../lib/trainingPlan';

export interface ExercisePrescription {
  repMin?: number;
  repMax?: number;
  rirMin?: number;
  rirMax?: number;
  restMinSeconds?: number;
  restMaxSeconds?: number;
}

export interface RoutineSet {
  id?: string;
  reps: number;
  weight: number;
  rir?: number;
  cardioMetrics?: CardioMetrics;
  isWarmup?: boolean;
  isFailure?: boolean; // set taken to muscular failure
  // Sub-series para dropsets (3.1, 3.2, etc.) - cada una con peso/reps diferentes
  dropsets?: Array<{ reps: number; weight: number }>;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  notes?: string;
  sets: RoutineSet[];
  restSeconds?: number; // Rest time in seconds for this exercise
  secondaryMuscles?: string[];
  secondaryMuscleFactor?: number;
  includesBodyweight?: boolean; // For exercises like dips, pull-ups where volume = bodyweight + added weight
  trackingType?: 'reps' | 'time'; // 'reps' for repetitions, 'time' for time-based (seconds)
  supersetId?: string; // exercises sharing a supersetId form a superset/circuit
  activityType?: 'strength' | 'cardio';
  prescription?: ExercisePrescription;
  cardioTargets?: CardioMetrics;
  // Legacy fields for backward compatibility - optional or deprecated
  reps?: number;
  weight?: number;
}

export interface UserData {
  id: string;
  email?: string;
  provider?: string;
  last_sign_in_at?: string;
  user_metadata?: any;
  default_rest_seconds?: number;
  default_sets_count?: number;
  default_reps_count?: number;
  default_weight_kg?: number;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  category: string;
  instructions?: string;
  tracking_type: 'reps' | 'time'; // 'reps' for repetitions, 'time' for time-based (seconds)
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id?: string;
  routine_name: string;
  started_at: string;
  completed_at: string;
  exercises_completed: any[];
  workout_data?: any; // To support JSONB data including nested exercises
  total_volume: number;
  duration_minutes: number;
}

export interface ActiveWorkoutExercise {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles?: string[];
  secondaryMuscleFactor?: number;
  restSeconds: number;
  imageUrl?: string;
  notes?: string;
  includesBodyweight?: boolean; // For exercises like dips where volume = bodyweight + added weight
  trackingType?: 'reps' | 'time'; // 'reps' for repetitions, 'time' for time-based (seconds)
  supersetId?: string; // exercises sharing a supersetId form a superset/circuit
  sets: Array<{
    id?: string;
    reps: number;
    weight: number;
    restSeconds?: number; // Legacy, rest now lives at exercise level
    completed: boolean;
    rir?: number;
    cardioMetrics?: CardioMetrics;
    isWarmup?: boolean;
    isFailure?: boolean; // set taken to muscular failure
    // Sub-series para dropsets (3.1, 3.2, etc.)
    dropsets?: Array<{ reps: number; weight: number; completed?: boolean }>;
  }>;
  activityType?: 'strength' | 'cardio';
  prescription?: ExercisePrescription;
  cardioTargets?: CardioMetrics;
}

export interface ActiveWorkoutRestTimer extends PersistedRestTimer {}

export interface ActiveWorkout {
  id?: string;
  routineId?: string;
  routineName: string;
  startedAt: string;
  isPaused?: boolean;
  pausedAt?: string;
  totalPausedMs?: number; // Track total paused time
  currentExerciseId?: string;
  currentSetIndex?: number;
  restTimer?: ActiveWorkoutRestTimer | null;
  exercises: ActiveWorkoutExercise[];
  overrideDate?: string; // YYYY-MM-DD for past-day workouts
  updatedAt?: string; // client ISO timestamp of last local mutation, for sync reconciliation
}

export interface RoutineUpdateCandidate {
  routineId: string;
  exercises: Exercise[];
}

export type WorkoutFinishResult =
  | { ok: true; routineUpdate?: RoutineUpdateCandidate }
  | { ok: false };

const ensureSetIds = <T extends { id?: string }>(sets: T[]) => {
  let changed = false;
  const next = sets.map((set) => {
    if (set.id) return set;
    changed = true;
    return { ...set, id: createId('set') };
  });
  return changed ? next : sets;
};

const normalizeExerciseSets = (exercise: Exercise): Exercise => {
  if (Array.isArray(exercise.sets)) {
    const normalized = ensureSetIds(exercise.sets);
    if (normalized !== exercise.sets) {
      return { ...exercise, sets: normalized };
    }
  }
  return exercise;
};

const normalizeActiveWorkoutExercises = (exercises: ActiveWorkoutExercise[]) =>
  exercises
    .filter((exercise) => exercise && typeof exercise.name === 'string')
    .map((exercise) => ({
      ...exercise,
      restSeconds: Number.isFinite(exercise.restSeconds)
        ? Math.max(0, Math.round(exercise.restSeconds))
        : Math.max(
            0,
            Math.round(
              exercise.sets?.find((set) => typeof set.restSeconds === 'number')?.restSeconds ?? 90
            )
          ),
      sets: Array.isArray(exercise.sets) ? ensureSetIds(exercise.sets) : [],
    }));

const toSafeRestSeconds = (value: number | undefined, fallback = 90) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.round(value));
};

const clampActiveSetIndex = (setIndex: number | undefined, setCount: number) => {
  const requestedSetIndex =
    typeof setIndex === 'number' && Number.isFinite(setIndex)
      ? Math.max(0, Math.floor(setIndex))
      : 0;
  return Math.min(requestedSetIndex, setCount - 1);
};

const buildActiveWorkoutAfterExerciseRemoval = (
  activeWorkout: ActiveWorkout,
  exerciseId: string
): { activeWorkout: ActiveWorkout; timerOwnerRemoved: boolean } | null => {
  const removedIndex = activeWorkout.exercises.findIndex(
    (exercise) => exercise.exerciseId === exerciseId
  );
  if (removedIndex < 0) return null;

  const remainingExercises = activeWorkout.exercises.filter(
    (exercise) => exercise.exerciseId !== exerciseId
  );
  const supersetCounts = remainingExercises.reduce<Record<string, number>>((counts, exercise) => {
    if (exercise.supersetId) {
      counts[exercise.supersetId] = (counts[exercise.supersetId] ?? 0) + 1;
    }
    return counts;
  }, {});
  const exercises = remainingExercises.map((exercise) =>
    exercise.supersetId && supersetCounts[exercise.supersetId] < 2
      ? { ...exercise, supersetId: undefined }
      : exercise
  );

  let currentExerciseId = activeWorkout.currentExerciseId;
  let currentSetIndex = activeWorkout.currentSetIndex;
  if (currentExerciseId) {
    let focusedExercise = exercises.find((exercise) => exercise.exerciseId === currentExerciseId);
    if (!focusedExercise) {
      focusedExercise = exercises[removedIndex] ?? exercises[removedIndex - 1];
    }

    if (focusedExercise?.sets.length) {
      currentExerciseId = focusedExercise.exerciseId;
      currentSetIndex = clampActiveSetIndex(currentSetIndex, focusedExercise.sets.length);
    } else {
      currentExerciseId = undefined;
      currentSetIndex = undefined;
    }
  } else {
    currentSetIndex = undefined;
  }

  const timerOwnerRemoved = activeWorkout.restTimer?.exerciseId === exerciseId;
  return {
    activeWorkout: {
      ...activeWorkout,
      currentExerciseId,
      currentSetIndex,
      restTimer: timerOwnerRemoved ? null : activeWorkout.restTimer,
      exercises,
    },
    timerOwnerRemoved,
  };
};

const mapActiveWorkoutExercisesToRoutine = (exercises: ActiveWorkoutExercise[]): Exercise[] =>
  exercises.map((exercise) => ({
    id: exercise.exerciseId,
    name: exercise.name,
    muscleGroup: exercise.primaryMuscle,
    ...(exercise.notes !== undefined ? { notes: exercise.notes } : {}),
    sets: exercise.sets.map((set) => ({
      id: set.id,
      reps: set.reps,
      weight: set.weight,
      ...(set.isWarmup !== undefined ? { isWarmup: set.isWarmup } : {}),
      ...(set.isFailure !== undefined ? { isFailure: set.isFailure } : {}),
      ...(set.dropsets
        ? {
            dropsets: set.dropsets.map((dropset) => ({
              reps: dropset.reps,
              weight: dropset.weight,
            })),
          }
        : {}),
    })),
    restSeconds: exercise.restSeconds,
    ...(exercise.secondaryMuscles !== undefined
      ? { secondaryMuscles: exercise.secondaryMuscles }
      : {}),
    ...(exercise.secondaryMuscleFactor !== undefined
      ? { secondaryMuscleFactor: exercise.secondaryMuscleFactor }
      : {}),
    ...(exercise.includesBodyweight !== undefined
      ? { includesBodyweight: exercise.includesBodyweight }
      : {}),
    ...(exercise.trackingType !== undefined ? { trackingType: exercise.trackingType } : {}),
    ...(exercise.supersetId !== undefined ? { supersetId: exercise.supersetId } : {}),
    ...(exercise.activityType !== undefined ? { activityType: exercise.activityType } : {}),
    ...(exercise.prescription ? { prescription: exercise.prescription } : {}),
    ...(exercise.cardioTargets ? { cardioTargets: exercise.cardioTargets } : {}),
  }));

const isSameActiveWorkout = (candidate: ActiveWorkout | null, captured: ActiveWorkout): boolean =>
  !!candidate &&
  !!captured.id &&
  candidate.id === captured.id &&
  candidate.startedAt === captured.startedAt;

export interface RoutineFolder {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  folder_id?: string | null;
  exercises: Exercise[];
  default_rest_seconds?: number;
  created_at: string;
  updated_at: string;
}

export type TrainingPlanInstallResult = {
  ok: boolean;
  created: number;
  skipped: number;
  folderId?: string;
  error?: string;
};

interface UserStats {
  recovery: number;
  totalVolume: number; // in kg
  consistency: number; // percentage
  streak: number;
}

interface OnboardingData {
  level: string;
  mainGoal: string;
  conditions: string[];
  weight?: number;
  height?: number;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps_left?: number;
  biceps_right?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
  shoulders?: number;
  neck?: number;
  forearm_left?: number;
  forearm_right?: number;
  notes?: string;
  created_at: string;
}

const defaultStats: UserStats = {
  recovery: 92,
  totalVolume: 12400,
  consistency: 15,
  streak: 5,
};

const getInitialUserScopedState = () => ({
  stats: { ...defaultStats },
  savedRoutines: [] as Routine[],
  currentRoutineId: null as string | null,
  routineFolders: [] as RoutineFolder[],
  workoutHistory: [] as WorkoutSession[],
  activeWorkout: null as ActiveWorkout | null,
  persistedUserId: null as string | null,
  bodyMeasurements: [] as BodyMeasurement[],
  personalRecords: {} as Record<string, { weight: number; reps: number; date: string }>,
  notification: null as { title: string; message: string; type: 'pr' | 'error' } | null,
  userData: null as UserData | null,
});

export type LoadContext = {
  userId: string;
  isCurrent: () => boolean;
};

export type LoadResult =
  | { ok: true }
  | { ok: false; reason: 'signed-out' | 'request-failed' | 'stale' };

type BootstrapLoader = (context?: LoadContext) => Promise<LoadResult | void>;
type AuthenticatedUser = {
  id: string;
  email?: string;
  app_metadata?: { provider?: string };
  last_sign_in_at?: string;
  user_metadata?: any;
};

const LOAD_OK: LoadResult = { ok: true };
const SIGNED_OUT: LoadResult = { ok: false, reason: 'signed-out' };
const REQUEST_FAILED: LoadResult = { ok: false, reason: 'request-failed' };
const STALE: LoadResult = { ok: false, reason: 'stale' };
const isMissingPersonalRecordsTable = (error: { code?: string } | null | undefined) =>
  error?.code === 'PGRST205';

type LegacyPersonalRecord = { weight: number; reps: number; date: string };

const deriveLegacyPersonalRecords = (
  history: Array<{
    completed_at: string;
    exercises_completed?: Array<{
      name?: string;
      sets?: Array<{
        completed?: boolean;
        weight?: number;
        reps?: number;
        isWarmup?: boolean;
      }>;
    }> | null;
  }>
) => {
  const records: Record<string, LegacyPersonalRecord> = {};

  history.forEach((session) => {
    session.exercises_completed?.forEach((exercise) => {
      if (!exercise.name || !Array.isArray(exercise.sets)) return;

      exercise.sets.forEach((setData) => {
        if (!setData.completed || setData.isWarmup) return;
        const currentMax = records[exercise.name]?.weight || 0;
        if ((setData.weight as number) > currentMax) {
          records[exercise.name] = {
            weight: setData.weight as number,
            reps: setData.reps as number,
            date: session.completed_at,
          };
        }
      });
    });
  });

  return records;
};

const resolveLoadUser = async (
  context: LoadContext | undefined,
  authSource: 'session' | 'user'
): Promise<{ user: AuthenticatedUser | null; result?: LoadResult }> => {
  try {
    let user: AuthenticatedUser | null;
    if (authSource === 'session') {
      const { data, error } = await supabase.auth.getSession();
      if (context && error) {
        return { user: null, result: REQUEST_FAILED };
      }
      user = data.session?.user ?? null;
    } else {
      const { data, error } = await supabase.auth.getUser();
      if (context && error) {
        return { user: null, result: REQUEST_FAILED };
      }
      user = data.user ?? null;
    }

    if (!user) return { user, result: SIGNED_OUT };
    if (context && (user.id !== context.userId || !context.isCurrent())) {
      return { user: null, result: STALE };
    }
    return { user };
  } catch (error) {
    if (context) return { user: null, result: REQUEST_FAILED };
    throw error;
  }
};

const staleAfterRequest = (context?: LoadContext) => (context ? !context.isCurrent() : false);

const completeLoad = (context?: LoadContext): LoadResult | void => (context ? LOAD_OK : undefined);

interface AppState {
  routineName: string;
  exercises: Exercise[];
  stats: UserStats;
  onboardingData: OnboardingData;

  // Routine Management
  savedRoutines: Routine[];
  currentRoutineId: string | null;

  // Routine Folders
  routineFolders: RoutineFolder[];
  loadFolders: BootstrapLoader;
  createFolder: (name: string, color?: string) => Promise<RoutineFolder | null>;
  updateFolder: (id: string, updates: Partial<RoutineFolder>) => Promise<void>;
  reorderFolders: (folderIds: string[]) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<void>;
  moveRoutineToFolder: (routineId: string, folderId: string | null) => Promise<void>;
  duplicateRoutine: (routineId: string) => Promise<Routine | null>;
  installTrainingPlan: () => Promise<TrainingPlanInstallResult>;

  // Exercise Library
  exerciseLibrary: ExerciseLibraryItem[];
  selectedMuscleFilter: string | null;
  selectedEquipmentFilter: string | null;
  exerciseSearchQuery: string;

  // Workout History
  workoutHistory: WorkoutSession[];

  // Active Workout
  activeWorkout: ActiveWorkout | null;
  persistedUserId: string | null;

  // Body Measurements
  bodyMeasurements: BodyMeasurement[];
  loadBodyMeasurements: BootstrapLoader;
  addBodyMeasurement: (
    measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>
  ) => Promise<void>;
  deleteBodyMeasurement: (id: string) => Promise<void>;

  // Personal Records
  personalRecords: Record<string, { weight: number; reps: number; date: string }>;
  notification: { title: string; message: string; type: 'pr' | 'error' } | null;
  loadPersonalRecords: BootstrapLoader;
  dismissNotification: () => void;
  syncPersonalRecords: () => Promise<void>;

  userData: UserData | null;
  loadUserData: BootstrapLoader;
  resetUserScopedState: () => void;

  setRoutineName: (name: string) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, updates: Partial<Exercise>) => void;
  setExercises: (exercises: Exercise[]) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;

  // Routine CRUD
  loadRoutines: BootstrapLoader;
  saveRoutine: (
    name: string,
    exercises: Exercise[],
    id?: string,
    folderId?: string | null,
    defaultRestSeconds?: number
  ) => Promise<{ data: Routine | null; error: string | null }>;
  updateRoutineFromWorkout: (candidate: RoutineUpdateCandidate) => Promise<boolean>;
  deleteRoutine: (id: string) => Promise<void>;
  setCurrentRoutineId: (id: string | null) => void;

  // Exercise Library
  loadExerciseLibrary: () => Promise<void>;
  setMuscleFilter: (muscle: string | null) => void;
  setEquipmentFilter: (equipment: string | null) => void;
  setExerciseSearchQuery: (query: string) => void;
  getFilteredExercises: () => ExerciseLibraryItem[];

  // Workout History
  loadWorkoutHistory: BootstrapLoader;
  saveWorkoutSession: (
    session: Omit<WorkoutSession, 'id' | 'user_id' | 'created_at'>
  ) => Promise<void>;
  deleteWorkoutSession: (sessionId: string) => Promise<void>;
  deleteWorkoutSessions: (ids: string[]) => Promise<void>;

  // Active Workout
  loadActiveWorkout: BootstrapLoader;
  startWorkout: (routine: Routine, overrideDate?: string) => Promise<boolean>;
  startEmptyWorkout: (overrideDate?: string) => Promise<boolean>;
  addActiveWorkoutExercise: (exercise: ExerciseLibraryItem) => Promise<void>;
  updateActiveWorkoutExerciseNotes: (exerciseId: string, notes: string) => Promise<void>;
  updateActiveWorkoutExerciseRest: (exerciseId: string, restSeconds: number) => Promise<void>;
  setActiveExerciseSuperset: (exerciseId: string, supersetId: string | null) => Promise<void>;
  removeActiveWorkoutExercise: (exerciseId: string) => Promise<boolean>;
  reorderActiveWorkoutExercises: (activeId: string, overId: string) => Promise<boolean>;
  updateWorkoutExerciseSets: (
    exerciseId: string,
    sets: ActiveWorkoutExercise['sets']
  ) => Promise<void>;
  setActiveWorkoutPosition: (exerciseId: string, setIndex: number) => Promise<void>;
  startRestTimer: (exerciseId: string, setIndex: number, durationSeconds: number) => Promise<void>;
  clearRestTimer: () => Promise<void>;
  pauseRestTimer: () => Promise<void>;
  resumeRestTimer: () => Promise<void>;
  extendRestTimer: (secondsToAdd: number) => Promise<void>;
  saveActiveWorkoutProgress: () => Promise<void>;
  flushActiveWorkoutProgress: (context?: LoadContext) => Promise<boolean>;
  flushActiveWorkoutNow: (context?: LoadContext) => Promise<boolean>;
  beaconFlushActiveWorkout: () => void;
  finishWorkout: () => Promise<WorkoutFinishResult>;
  clearActiveWorkout: () => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  cancelWorkout: () => Promise<void>;
}

// Debounce window for persisting active-workout progress to Supabase. Local state
// (and localStorage via persist) updates instantly; the network write is coalesced
// so a single "complete set" tap produces one write instead of several.
const ACTIVE_WORKOUT_SAVE_DEBOUNCE_MS = 600;
const ACTIVE_WORKOUT_WRITE_TIMEOUT_MS = 10_000;
let activeWorkoutFlushTimer: ReturnType<typeof setTimeout> | null = null;
const activeWorkoutFlushQueues = new Map<string, Promise<void>>();
const serializeActiveWorkoutFlush = <T>(ownerId: string, flush: () => Promise<T>): Promise<T> => {
  const result = (activeWorkoutFlushQueues.get(ownerId) ?? Promise.resolve()).then(flush);
  const queueTail = result.then(
    () => undefined,
    () => undefined
  );
  activeWorkoutFlushQueues.set(ownerId, queueTail);
  void queueTail.then(() => {
    if (activeWorkoutFlushQueues.get(ownerId) === queueTail) {
      activeWorkoutFlushQueues.delete(ownerId);
    }
  });
  return result;
};
const runBoundedActiveWorkoutWrite = async <T>(
  write: (signal: AbortSignal) => PromiseLike<T>
): Promise<T | null> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, ACTIVE_WORKOUT_WRITE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([Promise.resolve(write(controller.signal)), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
const ACTIVE_WORKOUT_SAVE_ERROR = {
  title: 'No se pudo guardar',
  message:
    'No se pudieron guardar los cambios del entrenamiento. Se mantienen en este dispositivo para reintentarlo.',
  type: 'error' as const,
};

let trainingPlanInstallPromise: Promise<TrainingPlanInstallResult> | null = null;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      routineName: 'Empuje - Fuerza Máxima',
      exercises: [
        {
          id: '1',
          name: 'Press de Banca Plano',
          muscleGroup: 'Pecho',
          sets: [
            { reps: 8, weight: 85 },
            { reps: 8, weight: 85 },
            { reps: 8, weight: 85 },
          ],
        },
      ],
      ...getInitialUserScopedState(),
      onboardingData: {
        level: 'Intermedio',
        mainGoal: 'Fuerza',
        conditions: [],
        weight: 75,
        height: 175,
      },

      // Exercise Library
      exerciseLibrary: [],
      selectedMuscleFilter: null,
      selectedEquipmentFilter: null,
      exerciseSearchQuery: '',

      loadUserData: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'session');
        if (!user) {
          if (!context && result && 'reason' in result && result.reason === 'signed-out') {
            set({ userData: null });
            return;
          }
          return result;
        }

        if (user) {
          // Fetch additional profile data
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (context && error) return REQUEST_FAILED;
          if (staleAfterRequest(context)) return STALE;

          set({
            userData: {
              id: user.id,
              email: user.email,
              provider: user.app_metadata.provider,
              last_sign_in_at: user.last_sign_in_at,
              user_metadata: user.user_metadata,
              default_rest_seconds: profile?.default_rest_seconds || 90,
              default_sets_count: profile?.default_sets_count || 3,
              default_reps_count: profile?.default_reps_count || 10,
              default_weight_kg: profile?.default_weight_kg || 20,
            },
          });
        }
        return completeLoad(context);
      },

      resetUserScopedState: () => set(getInitialUserScopedState()),

      setRoutineName: (name) => set({ routineName: name }),
      addExercise: (exercise) =>
        set((state) => ({
          exercises: [...state.exercises, normalizeExerciseSets(exercise)],
        })),
      removeExercise: (id) =>
        set((state) => ({ exercises: state.exercises.filter((e) => e.id !== id) })),
      updateExercise: (id, updates) =>
        set((state) => {
          // Only touch `sets` when explicitly provided, otherwise a partial update
          // (e.g. { restSeconds } or { supersetId }) would wipe the existing sets.
          const normalizedUpdates = Array.isArray(updates.sets)
            ? { ...updates, sets: ensureSetIds(updates.sets) }
            : updates;
          return {
            exercises: state.exercises.map((e) =>
              e.id === id ? { ...e, ...normalizedUpdates } : e
            ),
          };
        }),
      setExercises: (exercises) => set({ exercises: exercises.map(normalizeExerciseSets) }),
      updateOnboardingData: (data) =>
        set((state) => ({ onboardingData: { ...state.onboardingData, ...data } })),

      // Routine Management Functions
      loadRoutines: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'user');
        if (!user) return context ? result : undefined;

        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (context && error) return REQUEST_FAILED;
        if (staleAfterRequest(context)) return STALE;
        if (error || !data) return;

        set({ savedRoutines: data });
        return completeLoad(context);
      },

      saveRoutine: async (
        name: string,
        exercises: Exercise[],
        id?: string,
        folderId?: string | null,
        defaultRestSeconds?: number
      ) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.error('saveRoutine: No authenticated user');
          return {
            data: null,
            error: 'No se detectó un usuario autenticado. Por favor inicia sesión.',
          };
        }

        const routineData: any = {
          user_id: user.id,
          name,
          exercises,
          updated_at: new Date().toISOString(),
        };

        if (folderId !== undefined) {
          routineData.folder_id = folderId;
        }

        if (defaultRestSeconds !== undefined) {
          routineData.default_rest_seconds = defaultRestSeconds;
        }

        if (id) {
          // Update existing
          const { data, error } = await supabase
            .from('routines')
            .update(routineData)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            console.error('saveRoutine update error:', error);
            return { data: null, error: `Error al actualizar: ${error.message}` };
          }
          if (data) {
            await get().loadRoutines();
            return { data, error: null };
          }
        } else {
          // Create new
          const { data, error } = await supabase
            .from('routines')
            .insert([routineData])
            .select()
            .single();

          if (error) {
            console.error('saveRoutine insert error:', error);
            return { data: null, error: `Error al crear: ${error.message}` };
          }
          if (data) {
            await get().loadRoutines();
            return { data, error: null };
          }
        }
        return { data: null, error: 'Error desconocido al guardar.' };
      },

      updateRoutineFromWorkout: async (candidate) => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const user = session?.user ?? null;
          if (!user) return false;

          const { data, error } = await supabase
            .from('routines')
            .update({ exercises: candidate.exercises })
            .eq('id', candidate.routineId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();

          if (error || !data) return false;

          set((state) => ({
            savedRoutines: state.savedRoutines.map((routine) =>
              routine.id === candidate.routineId
                ? { ...routine, exercises: candidate.exercises }
                : routine
            ),
          }));
          return true;
        } catch {
          return false;
        }
      },

      deleteRoutine: async (id: string) => {
        await supabase.from('routines').delete().eq('id', id);
        await get().loadRoutines();
      },

      setCurrentRoutineId: (id: string | null) => set({ currentRoutineId: id }),

      // --- Folder Management Functions ---
      loadFolders: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'user');
        if (!user) return context ? result : undefined;

        const { data, error } = await supabase
          .from('routine_folders')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (context && error) return REQUEST_FAILED;
        if (staleAfterRequest(context)) return STALE;
        if (error || !data) return;

        set({ routineFolders: data });
        return completeLoad(context);
      },

      createFolder: async (name: string, color?: string) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const folders = get().routineFolders;
        const maxOrder = folders.length > 0 ? Math.max(...folders.map((f) => f.order_index)) : 0;

        const { data, error } = await supabase
          .from('routine_folders')
          .insert([
            {
              user_id: user.id,
              name,
              color: color || '#3b82f6',
              order_index: maxOrder + 1,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          await get().loadFolders();
          return data;
        }
        return null;
      },

      updateFolder: async (id: string, updates: Partial<RoutineFolder>) => {
        const { error } = await supabase
          .from('routine_folders')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) {
          await get().loadFolders();
        }
      },

      reorderFolders: async (folderIds: string[]) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return false;

          const folders = get().routineFolders;
          const uniqueIds = new Set(folderIds);
          const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
          const isValidOrder =
            folderIds.length === folders.length &&
            uniqueIds.size === folders.length &&
            folders.every((folder) => folder.user_id === user.id) &&
            folderIds.every((id) => foldersById.has(id));

          if (!isValidOrder) return false;

          const reorderedFolders = folderIds.map((id, index) => ({
            ...foldersById.get(id)!,
            order_index: index + 1,
          }));
          const originalOrderIndexes = new Map(
            folders.map((folder) => [folder.id, folder.order_index])
          );
          const writtenFolderIds: string[] = [];
          const loadCanonicalFolders = async () => {
            try {
              const result = await get().loadFolders({
                userId: user.id,
                isCurrent: () => true,
              });
              return typeof result === 'object' && result !== null && result.ok === true;
            } catch {
              return false;
            }
          };
          const compensateWrittenFolders = async () => {
            for (const folderId of [...writtenFolderIds].reverse()) {
              const originalOrderIndex = originalOrderIndexes.get(folderId);
              if (originalOrderIndex === undefined) continue;

              try {
                await supabase
                  .from('routine_folders')
                  .update({ order_index: originalOrderIndex })
                  .eq('id', folderId)
                  .eq('user_id', user.id);
              } catch {
                // Compensation is best effort; the canonical reload remains authoritative.
              }
            }
          };
          const reconcileFailure = async () => {
            await compensateWrittenFolders();
            await loadCanonicalFolders();
            return false;
          };

          try {
            for (const folder of reorderedFolders) {
              const { error } = await supabase
                .from('routine_folders')
                .update({ order_index: folder.order_index })
                .eq('id', folder.id)
                .eq('user_id', user.id);

              if (error) return await reconcileFailure();
              writtenFolderIds.push(folder.id);
            }
          } catch {
            return await reconcileFailure();
          }

          return await loadCanonicalFolders();
        } catch {
          return false;
        }
      },

      deleteFolder: async (id: string) => {
        // Move routines out of the folder before deleting
        await supabase.from('routines').update({ folder_id: null }).eq('folder_id', id);

        await supabase.from('routine_folders').delete().eq('id', id);
        await get().loadFolders();
        await get().loadRoutines();
      },

      moveRoutineToFolder: async (routineId: string, folderId: string | null) => {
        const { error } = await supabase
          .from('routines')
          .update({ folder_id: folderId, updated_at: new Date().toISOString() })
          .eq('id', routineId);

        if (!error) {
          await get().loadRoutines();
        }
      },

      duplicateRoutine: async (routineId: string) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return null;

        const routine = get().savedRoutines.find((r) => r.id === routineId);
        if (!routine) return null;

        const { data, error } = await supabase
          .from('routines')
          .insert([
            {
              user_id: user.id,
              name: `${routine.name} (copia)`,
              exercises: routine.exercises,
              folder_id: routine.folder_id,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          await get().loadRoutines();
          return data;
        }
        return null;
      },

      installTrainingPlan: (): Promise<TrainingPlanInstallResult> => {
        if (trainingPlanInstallPromise) return trainingPlanInstallPromise;

        const operation = (async (): Promise<TrainingPlanInstallResult> => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              return {
                ok: false,
                created: 0,
                skipped: 0,
                error: 'No se detectó un usuario autenticado. Por favor inicia sesión.',
              };
            }

            // Read from Supabase before deciding what to create. The page loads
            // these collections asynchronously, so in-memory state may still be
            // empty when the user taps the import button.
            const [foldersResult, routinesResult] = await Promise.all([
              supabase
                .from('routine_folders')
                .select('*')
                .eq('user_id', user.id)
                .order('order_index', { ascending: true }),
              supabase
                .from('routines')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false }),
            ]);
            if (foldersResult.error || routinesResult.error) {
              return {
                ok: false,
                created: 0,
                skipped: 0,
                error: 'No se pudieron cargar tus rutinas. Vuelve a intentarlo.',
              };
            }

            const folders = (foldersResult.data || []) as RoutineFolder[];
            const routines = (routinesResult.data || []) as Routine[];
            set({ routineFolders: folders, savedRoutines: routines });

            let folder = folders.find((candidate) => candidate.name === TRAINING_PLAN_FOLDER_NAME);
            if (!folder) {
              folder = await get().createFolder(TRAINING_PLAN_FOLDER_NAME, '#22c55e');
            }
            if (!folder) {
              // Another tab may have created the folder between the read and
              // insert. Re-read once before reporting a hard failure.
              const { data: refreshedFolders, error: refreshError } = await supabase
                .from('routine_folders')
                .select('*')
                .eq('user_id', user.id)
                .eq('name', TRAINING_PLAN_FOLDER_NAME)
                .order('order_index', { ascending: true });
              folder =
                !refreshError && refreshedFolders?.[0]
                  ? (refreshedFolders[0] as RoutineFolder)
                  : undefined;
            }
            if (!folder) {
              return {
                ok: false,
                created: 0,
                skipped: 0,
                error: 'No se pudo crear la carpeta del plan.',
              };
            }

            const existingNames = new Set(
              routines
                .filter((routine) => routine.folder_id === folder.id)
                .map((routine) => routine.name)
            );
            const planRoutines = buildTrainingPlanRoutines(user.id, folder.id);
            let created = 0;
            let skipped = 0;

            for (const routine of planRoutines) {
              if (existingNames.has(routine.name)) {
                skipped += 1;
                continue;
              }

              const { error } = await supabase.from('routines').insert([routine]);
              if (error) {
                await get().loadRoutines();
                return {
                  ok: false,
                  created,
                  skipped,
                  folderId: folder.id,
                  error: `No se pudo importar el plan: ${error.message}`,
                };
              }
              existingNames.add(routine.name);
              created += 1;
            }

            await Promise.all([get().loadFolders(), get().loadRoutines()]);
            return { ok: true, created, skipped, folderId: folder.id };
          } catch (error) {
            return {
              ok: false,
              created: 0,
              skipped: 0,
              error: error instanceof Error ? error.message : 'No se pudo importar el plan.',
            };
          }
        })();

        trainingPlanInstallPromise = operation.finally(() => {
          trainingPlanInstallPromise = null;
        });
        return trainingPlanInstallPromise;
      },

      // Exercise Library Functions
      loadExerciseLibrary: async () => {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data) {
          set({ exerciseLibrary: data });
        }
      },

      setMuscleFilter: (muscle: string | null) => set({ selectedMuscleFilter: muscle }),
      setEquipmentFilter: (equipment: string | null) => set({ selectedEquipmentFilter: equipment }),
      setExerciseSearchQuery: (query: string) => set({ exerciseSearchQuery: query }),

      getFilteredExercises: () => {
        const state = get();
        let filtered = state.exerciseLibrary.filter(
          (ex): ex is ExerciseLibraryItem => !!ex && typeof ex.name === 'string'
        );

        if (state.selectedMuscleFilter) {
          filtered = filtered.filter((ex) => ex.primary_muscle === state.selectedMuscleFilter);
        }

        if (state.selectedEquipmentFilter) {
          filtered = filtered.filter((ex) => ex.equipment === state.selectedEquipmentFilter);
        }

        if (state.exerciseSearchQuery) {
          const normalize = (str: string) =>
            str
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');

          const query = normalize(state.exerciseSearchQuery);

          filtered = filtered.filter((ex) => normalize(ex.name).includes(query));
        }

        return filtered;
      },

      // Workout History Functions
      loadWorkoutHistory: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'user');
        if (!user) return context ? result : undefined;

        const { data, error } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (context && error) return REQUEST_FAILED;
        if (error || !data) return;

        if (!error && data) {
          // Calculate Stats
          const now = new Date();
          const lastWorkout = data[0]; // Most recent because of ordering

          // 1. Recovery (Simple Algorithm: 24h = 50%, 48h = 100%)
          let recovery = 100;
          if (lastWorkout) {
            const lastDate = new Date(lastWorkout.completed_at);
            const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
            recovery = Math.min(100, Math.round((hoursSince / 48) * 100));
          }

          // 2. Total Volume
          const totalVolume = data.reduce((acc, curr) => acc + (curr.total_volume || 0), 0);

          // 3. Consistency (Workouts in last 7 days vs Goal of 3)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const workoutsLastWeek = data.filter((w) => new Date(w.completed_at) > oneWeekAgo).length;
          const consistency = Math.min(100, Math.round((workoutsLastWeek / 3) * 100)); // Assuming 3 workouts/week goal

          // 4. Streak (Weeks with at least 1 workout) - Simple approximation
          let streak = 0;
          if (data.length > 0) {
            // This is a placeholder for a complex streak calc, sticking to simple active valid workouts for now
            streak = workoutsLastWeek > 0 ? 1 : 0;
          }

          if (staleAfterRequest(context)) return STALE;

          set({
            workoutHistory: data,
            stats: {
              recovery,
              totalVolume,
              consistency,
              streak,
            },
          });
          return completeLoad(context);
        }
      },

      saveWorkoutSession: async (session) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('workout_sessions')
          .insert([{ ...session, user_id: user.id }]);

        if (!error) {
          await get().loadWorkoutHistory();
        }
      },

      deleteWorkoutSession: async (id: string) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('workout_sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) throw error;

          // Reload history
          await get().loadWorkoutHistory();
          // Recalculate PRs
          await get().syncPersonalRecords();
        } catch (error) {
          console.error('Error deleting workout session:', error);
        }
      },

      deleteWorkoutSessions: async (ids: string[]) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase
            .from('workout_sessions')
            .delete()
            .in('id', ids)
            .eq('user_id', user.id);

          if (error) throw error;

          // Reload history
          await get().loadWorkoutHistory();
          // Recalculate PRs
          await get().syncPersonalRecords();
        } catch (error) {
          console.error('Error deleting workout sessions:', error);
        }
      },

      // Active Workout Functions
      loadActiveWorkout: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'session');
        if (!user) {
          if (!context && result && 'reason' in result && result.reason === 'signed-out') {
            set({ activeWorkout: null, persistedUserId: null });
            return;
          }
          return result;
        }

        const { data, error } = await supabase
          .from('active_workouts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('loadActiveWorkout error:', error);
          if (context) return REQUEST_FAILED;
          // On a transient fetch error, keep whatever we have locally rather than wiping it.
          set({ persistedUserId: user.id });
          return;
        }
        if (staleAfterRequest(context)) return STALE;

        // Reconciliation: never blindly overwrite a locally-newer in-progress workout
        // with a stale server copy (e.g. when the last write was lost to a backgrounded
        // PWA). Compare client_updated_at and keep whichever side is newer.
        const local = get().activeWorkout;
        const sameUser = get().persistedUserId === user.id;
        const localUpdatedAt = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

        if (!error && data) {
          const serverUpdatedAtRaw = data.workout_data?.client_updated_at ?? data.updated_at;
          const serverUpdatedAt = serverUpdatedAtRaw ? new Date(serverUpdatedAtRaw).getTime() : 0;

          if (local && sameUser && localUpdatedAt > serverUpdatedAt) {
            // Local is ahead of the server — keep it and push it back up.
            set({ persistedUserId: user.id });
            await get().flushActiveWorkoutNow(context);
            return completeLoad(context);
          }

          const workoutData = readActiveWorkoutDataPayload(data.workout_data);
          const rawExercises = workoutData.exercises;
          const normalizedExercises = normalizeActiveWorkoutExercises(
            rawExercises as ActiveWorkoutExercise[]
          );
          set({
            activeWorkout: {
              id: data.id,
              routineId: data.routine_id,
              routineName: data.routine_name,
              startedAt: data.started_at,
              isPaused: data.workout_data?.is_paused ?? false,
              pausedAt: data.workout_data?.paused_at ?? undefined,
              totalPausedMs: data.workout_data?.total_paused_ms ?? 0,
              currentExerciseId: workoutData.currentExerciseId,
              currentSetIndex: workoutData.currentSetIndex,
              restTimer: workoutData.restTimer,
              exercises: normalizedExercises,
              overrideDate: workoutData.overrideDate,
              updatedAt:
                typeof data.workout_data?.client_updated_at === 'string'
                  ? data.workout_data.client_updated_at
                  : undefined,
            },
            persistedUserId: user.id,
          });
          return completeLoad(context);
        }

        // No server row. If we still hold a local in-progress workout for this user,
        // it just hasn't synced yet — keep it and recreate the row instead of wiping it.
        if (local && sameUser) {
          set({ persistedUserId: user.id });
          await get().flushActiveWorkoutNow(context);
          return completeLoad(context);
        }

        set({ activeWorkout: null, persistedUserId: user.id });
        return completeLoad(context);
      },

      updateWorkoutExerciseSets: async (
        exerciseId: string,
        sets: ActiveWorkoutExercise['sets']
      ) => {
        const state = get();
        if (!state.activeWorkout) return;

        const normalizedSets = ensureSetIds(sets);
        const safeExercises = Array.isArray(state.activeWorkout.exercises)
          ? state.activeWorkout.exercises.filter(
              (ex): ex is ActiveWorkoutExercise => !!ex && typeof ex.exerciseId === 'string'
            )
          : [];
        const updatedExercises = safeExercises.map((ex) =>
          ex.exerciseId === exerciseId
            ? {
                ...ex,
                sets: normalizedSets.map((set) => ({
                  ...set,
                  restSeconds: ex.restSeconds,
                })),
              }
            : ex
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: exerciseId,
            exercises: updatedExercises,
          },
        });

        await get().saveActiveWorkoutProgress();
      },

      setActiveExerciseSuperset: async (exerciseId: string, supersetId: string | null) => {
        const state = get();
        if (!state.activeWorkout) return;

        const exercises = (
          Array.isArray(state.activeWorkout.exercises) ? state.activeWorkout.exercises : []
        ).map((ex) =>
          ex && ex.exerciseId === exerciseId ? { ...ex, supersetId: supersetId ?? undefined } : ex
        );

        set({ activeWorkout: { ...state.activeWorkout, exercises } });
        await get().saveActiveWorkoutProgress();
      },

      removeActiveWorkoutExercise: async (exerciseId: string) => {
        const state = get();
        if (!state.activeWorkout) return false;
        const editOwnerId = state.persistedUserId;
        const editStartedAt = state.activeWorkout.startedAt;

        const removal = buildActiveWorkoutAfterExerciseRemoval(state.activeWorkout, exerciseId);
        if (!removal) return false;

        set({ activeWorkout: removal.activeWorkout });
        if (removal.timerOwnerRemoved) cancelRestPush();
        await get().saveActiveWorkoutProgress();

        const persisted = await get().flushActiveWorkoutNow();
        const currentState = get();
        if (
          !persisted &&
          currentState.persistedUserId === editOwnerId &&
          currentState.activeWorkout?.startedAt === editStartedAt
        ) {
          set({ notification: ACTIVE_WORKOUT_SAVE_ERROR });
        }
        return persisted;
      },

      reorderActiveWorkoutExercises: async (activeId: string, overId: string) => {
        const state = get();
        if (!state.activeWorkout) return false;
        const editOwnerId = state.persistedUserId;
        const editStartedAt = state.activeWorkout.startedAt;

        const exercises = [...state.activeWorkout.exercises];
        const activeIndex = exercises.findIndex((exercise) => exercise.exerciseId === activeId);
        const overIndex = exercises.findIndex((exercise) => exercise.exerciseId === overId);
        if (activeIndex < 0 || overIndex < 0) return false;
        if (activeIndex === overIndex) return true;

        const [moved] = exercises.splice(activeIndex, 1);
        exercises.splice(overIndex, 0, moved);
        set({
          activeWorkout: {
            ...state.activeWorkout,
            exercises,
          },
        });
        await get().saveActiveWorkoutProgress();

        const persisted = await get().flushActiveWorkoutNow();
        const currentState = get();
        if (
          !persisted &&
          currentState.persistedUserId === editOwnerId &&
          currentState.activeWorkout?.startedAt === editStartedAt
        ) {
          set({ notification: ACTIVE_WORKOUT_SAVE_ERROR });
        }
        return persisted;
      },

      updateActiveWorkoutExerciseNotes: async (exerciseId: string, notes: string) => {
        const state = get();
        if (!state.activeWorkout) return;

        const safeExercises = Array.isArray(state.activeWorkout.exercises)
          ? state.activeWorkout.exercises.filter(
              (ex): ex is ActiveWorkoutExercise => !!ex && typeof ex.exerciseId === 'string'
            )
          : [];
        const updatedExercises = safeExercises.map((ex) =>
          ex.exerciseId === exerciseId ? { ...ex, notes } : ex
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: exerciseId,
            exercises: updatedExercises,
          },
        });

        await get().saveActiveWorkoutProgress();
      },

      updateActiveWorkoutExerciseRest: async (exerciseId: string, restSeconds: number) => {
        const state = get();
        if (!state.activeWorkout) return;

        const safeRestSeconds = toSafeRestSeconds(restSeconds);
        const safeExercises = Array.isArray(state.activeWorkout.exercises)
          ? state.activeWorkout.exercises.filter(
              (ex): ex is ActiveWorkoutExercise => !!ex && typeof ex.exerciseId === 'string'
            )
          : [];

        const updatedExercises = safeExercises.map((exercise) => {
          if (exercise.exerciseId !== exerciseId) return exercise;
          return {
            ...exercise,
            restSeconds: safeRestSeconds,
            sets: exercise.sets.map((set) => ({
              ...set,
              restSeconds: safeRestSeconds,
            })),
          };
        });

        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: exerciseId,
            exercises: updatedExercises,
          },
        });

        await get().saveActiveWorkoutProgress();
      },

      setActiveWorkoutPosition: async (exerciseId: string, setIndex: number) => {
        const state = get();
        if (!state.activeWorkout) return;

        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: exerciseId,
            currentSetIndex: setIndex,
          },
        });

        await get().saveActiveWorkoutProgress();
      },

      startRestTimer: async (exerciseId: string, setIndex: number, durationSeconds: number) => {
        const state = get();
        if (!state.activeWorkout) return;

        const safeDuration = toSafeRestSeconds(durationSeconds);
        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: exerciseId,
            currentSetIndex: setIndex,
            restTimer: {
              exerciseId,
              setIndex,
              durationSeconds: safeDuration,
              startedAt: new Date().toISOString(),
              pausedAt: undefined,
              pausedElapsedSeconds: 0,
              instanceId: createId('rest'),
            },
          },
        });

        // Schedule a server-side push so the alert fires even if the PWA is
        // backgrounded/locked (the only reliable rest alert on iOS).
        scheduleRestPush(Date.now() + safeDuration * 1000);

        await get().saveActiveWorkoutProgress();
      },

      clearRestTimer: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        set({
          activeWorkout: {
            ...state.activeWorkout,
            restTimer: null,
          },
        });

        cancelRestPush();

        await get().saveActiveWorkoutProgress();
      },

      pauseRestTimer: async () => {
        const state = get();
        if (!state.activeWorkout?.restTimer) return;

        const elapsedSeconds = getRestTimerElapsedSeconds(state.activeWorkout.restTimer);

        set({
          activeWorkout: {
            ...state.activeWorkout,
            restTimer: {
              ...state.activeWorkout.restTimer,
              pausedAt: new Date().toISOString(),
              pausedElapsedSeconds: elapsedSeconds,
            },
          },
        });

        cancelRestPush();

        await get().saveActiveWorkoutProgress();
      },

      resumeRestTimer: async () => {
        const state = get();
        if (!state.activeWorkout?.restTimer) return;

        const pausedElapsedSeconds = state.activeWorkout.restTimer.pausedElapsedSeconds ?? 0;
        const resumedStartedAt = new Date(Date.now() - pausedElapsedSeconds * 1000).toISOString();
        const remainingSeconds = Math.max(
          0,
          state.activeWorkout.restTimer.durationSeconds - pausedElapsedSeconds
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            restTimer: {
              ...state.activeWorkout.restTimer,
              startedAt: resumedStartedAt,
              pausedAt: undefined,
            },
          },
        });

        scheduleRestPush(Date.now() + remainingSeconds * 1000);

        await get().saveActiveWorkoutProgress();
      },

      extendRestTimer: async (secondsToAdd: number) => {
        const state = get();
        if (!state.activeWorkout?.restTimer) return;

        const durationSeconds = toSafeRestSeconds(
          state.activeWorkout.restTimer.durationSeconds + secondsToAdd,
          state.activeWorkout.restTimer.durationSeconds
        );

        set({
          activeWorkout: {
            ...state.activeWorkout,
            restTimer: {
              ...state.activeWorkout.restTimer,
              durationSeconds,
            },
          },
        });

        const updatedTimer = get().activeWorkout?.restTimer;
        if (updatedTimer && !updatedTimer.pausedAt) {
          const remaining = Math.max(0, durationSeconds - getRestTimerElapsedSeconds(updatedTimer));
          scheduleRestPush(Date.now() + remaining * 1000);
        }

        await get().saveActiveWorkoutProgress();
      },

      // Stamp the local mutation time (used for sync reconciliation on reload) and
      // schedule a single debounced network write. Callers stay synchronous/instant.
      saveActiveWorkoutProgress: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        set({
          activeWorkout: {
            ...state.activeWorkout,
            updatedAt: new Date().toISOString(),
          },
        });

        if (activeWorkoutFlushTimer) clearTimeout(activeWorkoutFlushTimer);
        activeWorkoutFlushTimer = setTimeout(() => {
          activeWorkoutFlushTimer = null;
          void get().flushActiveWorkoutProgress();
        }, ACTIVE_WORKOUT_SAVE_DEBOUNCE_MS);
      },

      // The actual network write. Uses getSession() (local, no auth-server round-trip)
      // and upsert (self-heals if the row is missing). Persists client_updated_at so
      // reconciliation on the next load can tell which copy is newer.
      flushActiveWorkoutProgress: (context?: LoadContext) => {
        const requestedOwnerId = get().persistedUserId;
        if (!get().activeWorkout || !requestedOwnerId) return Promise.resolve(false);

        return serializeActiveWorkoutFlush(requestedOwnerId, async () => {
          let user: AuthenticatedUser | null;
          if (context) {
            ({ user } = await resolveLoadUser(context, 'session'));
            if (!user || context.userId !== requestedOwnerId) return false;
          } else {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            user = session?.user ?? null;
          }
          if (!user || user.id !== requestedOwnerId) return false;

          const state = get();
          if (!state.activeWorkout || state.persistedUserId !== requestedOwnerId) return false;

          const safeExercises = Array.isArray(state.activeWorkout.exercises)
            ? state.activeWorkout.exercises.filter(
                (ex): ex is ActiveWorkoutExercise => !!ex && typeof ex.exerciseId === 'string'
              )
            : [];

          const workoutData = buildActiveWorkoutDataPayload({
            exercises: safeExercises,
            currentExerciseId: state.activeWorkout.currentExerciseId,
            currentSetIndex: state.activeWorkout.currentSetIndex,
            restTimer: state.activeWorkout.restTimer || null,
            overrideDate: state.activeWorkout.overrideDate,
          });

          const query = supabase.from('active_workouts').upsert(
            {
              user_id: requestedOwnerId,
              routine_id: state.activeWorkout.routineId ?? null,
              routine_name: state.activeWorkout.routineName,
              started_at: state.activeWorkout.startedAt,
              workout_data: {
                ...workoutData,
                is_paused: state.activeWorkout.isPaused ?? false,
                paused_at: state.activeWorkout.pausedAt || null,
                total_paused_ms: state.activeWorkout.totalPausedMs || 0,
                client_updated_at: state.activeWorkout.updatedAt ?? new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          const result = await Promise.resolve(query).catch((error) => ({ error }));

          if (result.error) {
            console.error('flushActiveWorkoutProgress error:', result.error);
            return false;
          }
          return get().persistedUserId === requestedOwnerId && !!get().activeWorkout;
        });
      },

      // Cancel any pending debounce and write immediately (used on reconnect / finish).
      flushActiveWorkoutNow: async (context?: LoadContext) => {
        if (activeWorkoutFlushTimer) {
          clearTimeout(activeWorkoutFlushTimer);
          activeWorkoutFlushTimer = null;
        }
        return get().flushActiveWorkoutProgress(context);
      },

      // Best-effort flush that survives the page being suspended/closed. It shares
      // the owner queue with normal flushes and carries a timestamp precondition so
      // a delayed lifecycle PATCH cannot restore an older workout snapshot.
      beaconFlushActiveWorkout: () => {
        const requestedOwnerId = get().persistedUserId;
        const { accessToken, userId } = getCachedAuth();
        if (!requestedOwnerId || !accessToken || userId !== requestedOwnerId) return;

        void serializeActiveWorkoutFlush(requestedOwnerId, async () => {
          const state = get();
          if (!state.activeWorkout || state.persistedUserId !== requestedOwnerId) return;

          const safeExercises = Array.isArray(state.activeWorkout.exercises)
            ? state.activeWorkout.exercises.filter(
                (ex): ex is ActiveWorkoutExercise => !!ex && typeof ex.exerciseId === 'string'
              )
            : [];
          const clientUpdatedAt = state.activeWorkout.updatedAt ?? new Date().toISOString();
          const workoutData = buildActiveWorkoutDataPayload({
            exercises: safeExercises,
            currentExerciseId: state.activeWorkout.currentExerciseId,
            currentSetIndex: state.activeWorkout.currentSetIndex,
            restTimer: state.activeWorkout.restTimer || null,
            overrideDate: state.activeWorkout.overrideDate,
          });
          const body = JSON.stringify({
            workout_data: {
              ...workoutData,
              is_paused: state.activeWorkout.isPaused ?? false,
              paused_at: state.activeWorkout.pausedAt || null,
              total_paused_ms: state.activeWorkout.totalPausedMs || 0,
              client_updated_at: clientUpdatedAt,
            },
            updated_at: new Date().toISOString(),
          });
          const beaconUrl = new URL(`${SUPABASE_REST_URL}/rest/v1/active_workouts`);
          beaconUrl.searchParams.set('user_id', `eq.${requestedOwnerId}`);
          beaconUrl.searchParams.set(
            'or',
            `(workout_data->>client_updated_at.is.null,workout_data->>client_updated_at.lt.${clientUpdatedAt})`
          );

          try {
            await runBoundedActiveWorkoutWrite((signal) =>
              fetch(beaconUrl.toString(), {
                method: 'PATCH',
                keepalive: true,
                signal,
                headers: {
                  'Content-Type': 'application/json',
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${accessToken}`,
                  Prefer: 'return=minimal',
                },
                body,
              })
            );
          } catch (err) {
            console.error('beaconFlushActiveWorkout error:', err);
          }
        });
      },

      startEmptyWorkout: async (overrideDate?: string) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user found');
            return false;
          }

          const startedAt = overrideDate
            ? new Date(`${overrideDate}T09:00:00`).toISOString()
            : new Date().toISOString();

          const activeWorkout: ActiveWorkout = {
            routineId: undefined,
            routineName: 'Entrenamiento libre',
            startedAt,
            currentExerciseId: undefined,
            currentSetIndex: undefined,
            restTimer: null,
            exercises: [],
            overrideDate,
          };

          const workoutData = buildActiveWorkoutDataPayload(activeWorkout);
          const { data, error } = await supabase
            .from('active_workouts')
            .upsert(
              {
                user_id: user.id,
                routine_id: null,
                routine_name: activeWorkout.routineName,
                started_at: activeWorkout.startedAt,
                workout_data: {
                  ...workoutData,
                  is_paused: false,
                  paused_at: null,
                  total_paused_ms: 0,
                },
              },
              { onConflict: 'user_id' }
            )
            .select()
            .single();

          if (error) {
            console.error('Supabase error starting empty workout:', error);
            return false;
          }

          if (data) {
            set({
              activeWorkout: { ...activeWorkout, id: data.id },
              persistedUserId: user.id,
            });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Unexpected error starting empty workout:', err);
          return false;
        }
      },

      addActiveWorkoutExercise: async (exercise: ExerciseLibraryItem) => {
        const state = get();
        if (!state.activeWorkout) return;
        if (!exercise || !exercise.name) return;

        const trackingType = exercise.tracking_type || 'reps';
        const defaultSets = state.userData?.default_sets_count || 3;
        const defaultReps =
          state.userData?.default_reps_count ?? (trackingType === 'time' ? 30 : 10);
        const defaultWeight = state.userData?.default_weight_kg ?? 0;
        const restSeconds = state.userData?.default_rest_seconds ?? 90;

        const newExercise: ActiveWorkoutExercise = {
          exerciseId: createId('ex'),
          name: exercise.name,
          primaryMuscle: exercise.primary_muscle,
          secondaryMuscles: exercise.secondary_muscles || [],
          secondaryMuscleFactor: exercise.secondary_muscles?.length ? 0.35 : 0,
          restSeconds,
          trackingType,
          activityType: getActivityTypeFromLibraryExercise(exercise),
          sets: Array.from({ length: defaultSets }).map(() => ({
            id: createId('set'),
            reps: defaultReps,
            weight: trackingType === 'time' ? 0 : defaultWeight,
            completed: false,
          })),
        };

        const updatedExercises = [...state.activeWorkout.exercises, newExercise];

        set({
          activeWorkout: {
            ...state.activeWorkout,
            currentExerciseId: newExercise.exerciseId,
            currentSetIndex: 0,
            exercises: updatedExercises,
          },
        });

        await get().saveActiveWorkoutProgress();
      },

      startWorkout: async (routine: Routine, overrideDate?: string) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user found');
            return false;
          }

          // Fetch history if not populated
          let history = get().workoutHistory;
          if (history.length === 0) {
            await get().loadWorkoutHistory();
            history = get().workoutHistory;
          }

          const exercises: ActiveWorkoutExercise[] = routine.exercises.map((ex) => {
            // Handle new format (sets array) vs old format (sets number)
            let parsedSets: {
              id?: string;
              reps: number;
              weight: number;
              rir?: number;
              cardioMetrics?: CardioMetrics;
              isWarmup?: boolean;
              isFailure?: boolean;
              dropsets?: Array<{ reps: number; weight: number }>;
            }[] = [];

            if (Array.isArray(ex.sets)) {
              // New format - preserve dropsets, isWarmup and isFailure
              parsedSets = ex.sets.map((s) => ({
                id: s.id || createId('set'),
                reps: s.reps,
                weight: s.weight,
                rir: s.rir,
                cardioMetrics: s.cardioMetrics,
                isWarmup: s.isWarmup,
                isFailure: s.isFailure,
                dropsets: s.dropsets,
              }));
            } else if (typeof ex.sets === 'number') {
              // Backward compatibility for old format
              const setsCount = ex.sets;
              const reps = ex.reps || 10;
              const weight = ex.weight || 0;
              parsedSets = Array.from({ length: setsCount }, () => ({
                id: createId('set'),
                reps,
                weight,
              }));
            } else {
              // Fallback
              parsedSets = [{ id: createId('set'), reps: 10, weight: 0 }];
            }

            // Find last session with this exercise (by name)
            const lastSession = history.find((session) =>
              session.exercises_completed?.some((e: any) => e.name === ex.name)
            );

            if (lastSession) {
              const lastExercise = lastSession.exercises_completed.find(
                (e: any) => e.name === ex.name
              );
              if (lastExercise && lastExercise.sets) {
                // Apply last weights/reps to current sets
                const lastWorkingSets = Array.isArray(lastExercise.sets)
                  ? lastExercise.sets.filter((set: any) => !set?.isWarmup)
                  : [];
                let workingSetIndex = 0;
                parsedSets = parsedSets.map((defaultSet) => {
                  // A planned warmup is a separate slot and must never receive
                  // the previous working-set values by array position.
                  if (defaultSet.isWarmup) return defaultSet;
                  const lastSet = lastWorkingSets[workingSetIndex];
                  workingSetIndex += 1;
                  const reuseHistoricalValues =
                    ex.trackingType !== 'time' || ex.activityType === 'strength';
                  if (lastSet && reuseHistoricalValues) {
                    return {
                      ...defaultSet,
                      reps: lastSet.reps,
                      weight: lastSet.weight,
                    };
                  }
                  return defaultSet;
                });
              }
            }

            // Use exercise's restSeconds, fallback to routine's default, then user's default, then 90
            const restSeconds = toSafeRestSeconds(
              ex.restSeconds ??
                routine.default_rest_seconds ??
                get().userData?.default_rest_seconds ??
                90
            );

            return {
              exerciseId: ex.id,
              name: ex.name,
              primaryMuscle: ex.muscleGroup,
              secondaryMuscles: ex.secondaryMuscles || [],
              secondaryMuscleFactor:
                ex.secondaryMuscleFactor ?? ((ex.secondaryMuscles?.length || 0) > 0 ? 0.35 : 0),
              restSeconds,
              imageUrl: undefined,
              notes: ex.notes, // Copy notes from routine
              includesBodyweight: ex.includesBodyweight, // Pass bodyweight flag
              trackingType: ex.trackingType || 'reps', // Pass tracking type (reps or time)
              supersetId: ex.supersetId, // Carry superset grouping into the live workout
              activityType: ex.activityType,
              prescription: ex.prescription,
              cardioTargets: ex.cardioTargets,
              sets: parsedSets.map((s) => ({
                id: s.id || createId('set'),
                reps: s.reps,
                weight: s.weight,
                completed: false,
                rir: s.rir,
                cardioMetrics: s.cardioMetrics,
                isWarmup: s.isWarmup,
                isFailure: s.isFailure,
                dropsets: s.dropsets?.map((d) => ({ ...d, completed: false })),
              })),
            };
          });

          const startedAt = overrideDate
            ? new Date(`${overrideDate}T09:00:00`).toISOString()
            : new Date().toISOString();

          const activeWorkout: ActiveWorkout = {
            routineId: routine.id,
            routineName: routine.name,
            startedAt,
            overrideDate: overrideDate || undefined,
            currentExerciseId: exercises[0]?.exerciseId,
            currentSetIndex: 0,
            restTimer: null,
            exercises,
          };

          const workoutData = buildActiveWorkoutDataPayload(activeWorkout);
          const { data, error } = await supabase
            .from('active_workouts')
            .upsert(
              {
                user_id: user.id,
                routine_id: routine.id,
                routine_name: routine.name,
                started_at: activeWorkout.startedAt,
                workout_data: {
                  ...workoutData,
                  is_paused: false,
                  paused_at: null,
                  total_paused_ms: 0,
                },
              },
              { onConflict: 'user_id' }
            )
            .select()
            .single();

          if (error) {
            console.error('Supabase error starting workout:', error);
            return false;
          }

          if (data) {
            set({
              activeWorkout: { ...activeWorkout, id: data.id },
              persistedUserId: user.id,
            });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Unexpected error starting workout:', err);
          return false;
        }
      },

      finishWorkout: async () => {
        const activeWorkout = get().activeWorkout;
        const requestedOwnerId = get().persistedUserId;
        if (!activeWorkout?.id || !requestedOwnerId) return { ok: false };

        const stillOwnsCapturedWorkout = () =>
          get().persistedUserId === requestedOwnerId &&
          isSameActiveWorkout(get().activeWorkout, activeWorkout);
        const reportFinishFailure = (message: string) => {
          if (!stillOwnsCapturedWorkout()) return;
          set({
            notification: {
              title: 'No se pudo guardar',
              message,
              type: 'error',
            },
          });
        };

        let user: AuthenticatedUser | null = null;
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          user = session?.user ?? null;
        } catch {
          reportFinishFailure(
            'Tu sesion no esta activa. Vuelve a iniciar sesion; tu entrenamiento NO se ha borrado, puedes reintentar.'
          );
          return { ok: false };
        }

        if (!user || user.id !== requestedOwnerId) {
          reportFinishFailure(
            'Tu sesion no esta activa. Vuelve a iniciar sesion; tu entrenamiento NO se ha borrado, puedes reintentar.'
          );
          return { ok: false };
        }
        if (!stillOwnsCapturedWorkout()) {
          return { ok: false };
        }

        if (activeWorkoutFlushTimer) {
          clearTimeout(activeWorkoutFlushTimer);
          activeWorkoutFlushTimer = null;
        }

        const startTime = new Date(activeWorkout.startedAt);
        const endTime = new Date();
        const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

        let totalVolume = 0;
        const completedExercises = Array.isArray(activeWorkout.exercises)
          ? activeWorkout.exercises.filter(
              (ex): ex is ActiveWorkoutExercise => !!ex && Array.isArray(ex.sets)
            )
          : [];
        const userWeight = get().onboardingData?.weight || 0;

        completedExercises.forEach((ex) => {
          ex.sets.forEach((set) => {
            // Only count completed sets that are NOT warmup sets
            if (set.completed && !set.isWarmup) {
              // For bodyweight exercises (like dips), add user's bodyweight to the weight
              const effectiveWeight = ex.includesBodyweight ? set.weight + userWeight : set.weight;
              totalVolume += effectiveWeight * set.reps;

              // Also count dropset sub-series volume
              if (set.dropsets && set.dropsets.length > 0) {
                set.dropsets.forEach((dropset) => {
                  const dropsetWeight = ex.includesBodyweight
                    ? dropset.weight + userWeight
                    : dropset.weight;
                  totalVolume += dropsetWeight * dropset.reps;
                });
              }
            }
          });
        });

        // Use overrideDate if set (for past-day workouts)
        const overrideDate = activeWorkout.overrideDate;
        const completedAt = overrideDate
          ? new Date(`${overrideDate}T10:00:00`).toISOString()
          : endTime.toISOString();
        const startedAtFinal = overrideDate
          ? new Date(`${overrideDate}T09:00:00`).toISOString()
          : activeWorkout.startedAt;
        const hasOriginatingTemplate =
          !!activeWorkout.routineId &&
          get().savedRoutines.some((routine) => routine.id === activeWorkout.routineId);
        const routineUpdate =
          activeWorkout.routineId && hasOriginatingTemplate
            ? {
                routineId: activeWorkout.routineId,
                exercises: mapActiveWorkoutExercisesToRoutine(completedExercises),
              }
            : undefined;

        const finishResult = await serializeActiveWorkoutFlush(
          requestedOwnerId,
          async (): Promise<WorkoutFinishResult> => {
            if (!stillOwnsCapturedWorkout()) {
              return { ok: false };
            }

            let historyRow: { id: string } | null = null;
            try {
              const { data, error } = await supabase
                .from('workout_sessions')
                .insert({
                  id: activeWorkout.id,
                  user_id: requestedOwnerId,
                  routine_id: activeWorkout.routineId,
                  routine_name: activeWorkout.routineName,
                  started_at: startedAtFinal,
                  completed_at: completedAt,
                  exercises_completed: completedExercises,
                  total_volume: totalVolume,
                  duration_minutes: overrideDate ? 60 : durationMinutes,
                })
                .select('id')
                .single();
              if (!error && data?.id === activeWorkout.id) {
                historyRow = data;
              }
            } catch {
              // The insert may have committed even if its response was lost.
            }

            if (!historyRow) {
              try {
                const { data, error } = await supabase
                  .from('workout_sessions')
                  .select('id')
                  .eq('id', activeWorkout.id)
                  .eq('user_id', requestedOwnerId)
                  .maybeSingle();
                if (!error && data?.id === activeWorkout.id) {
                  historyRow = data;
                }
              } catch {
                // Retry remains safe because the active UUID is also the history UUID.
              }
            }

            if (!historyRow) {
              reportFinishFailure(
                'Hubo un error al guardar el entrenamiento. NO se ha borrado; revisa tu conexion y reintenta.'
              );
              return { ok: false };
            }

            let activeDeleteError: unknown = null;
            let deletedActiveRow: { id: string } | null = null;
            try {
              const { data, error } = await supabase
                .from('active_workouts')
                .delete()
                .eq('user_id', requestedOwnerId)
                .eq('id', activeWorkout.id)
                .eq('started_at', activeWorkout.startedAt)
                .select('id')
                .maybeSingle();
              activeDeleteError = error;
              deletedActiveRow = data;
            } catch (error) {
              activeDeleteError = error;
            }

            if (activeDeleteError || !deletedActiveRow) {
              let compensationError: unknown = null;
              try {
                const { error } = await supabase
                  .from('workout_sessions')
                  .delete()
                  .eq('id', historyRow.id)
                  .eq('user_id', requestedOwnerId);
                compensationError = error;
              } catch (error) {
                compensationError = error;
              }
              reportFinishFailure(
                compensationError
                  ? 'No se pudo finalizar el entrenamiento ni reconciliar su historial. El entrenamiento activo se conserva; reintenta.'
                  : 'Hubo un conflicto al finalizar el entrenamiento. NO se ha borrado; puedes reintentar.'
              );
              return { ok: false };
            }

            if (stillOwnsCapturedWorkout()) {
              cancelRestPush();
              set({ activeWorkout: null, persistedUserId: requestedOwnerId });
            }
            return routineUpdate ? { ok: true, routineUpdate } : { ok: true };
          }
        );

        if (!finishResult.ok) return finishResult;
        if (get().persistedUserId !== requestedOwnerId) return finishResult;

        try {
          await get().loadWorkoutHistory();
          if (get().persistedUserId !== requestedOwnerId) return finishResult;

          // Check for PRs
          await get().loadPersonalRecords();
          if (get().persistedUserId !== requestedOwnerId) return finishResult;

          const currentPRs = get().personalRecords;
          let notificationToShow: { title: string; message: string; type: 'pr' } | null = null;

          for (const ex of completedExercises) {
            let maxWeight = 0;
            let maxReps = 0;

            ex.sets.forEach((s) => {
              if (
                s.completed &&
                !s.isWarmup &&
                ex.trackingType !== 'time' &&
                s.weight > maxWeight
              ) {
                maxWeight = s.weight;
                maxReps = s.reps;
              }
            });

            if (maxWeight > 0) {
              const previousMax = currentPRs[ex.name]?.weight || 0;
              if (maxWeight > previousMax) {
                // Update DB
                const { data: existing } = await supabase
                  .from('personal_records')
                  .select('id')
                  .eq('user_id', requestedOwnerId)
                  .eq('exercise_name', ex.name)
                  .maybeSingle();

                if (existing) {
                  await supabase
                    .from('personal_records')
                    .update({ weight: maxWeight, reps: maxReps, date: new Date().toISOString() })
                    .eq('id', existing.id);
                } else {
                  await supabase.from('personal_records').insert({
                    user_id: requestedOwnerId,
                    exercise_name: ex.name,
                    weight: maxWeight,
                    reps: maxReps,
                  });
                }

                notificationToShow = {
                  title: '¡Nuevo Récord Personal!',
                  message: `${ex.name}: ${maxWeight}kg`,
                  type: 'pr' as const,
                };
              }
            }
          }

          // Refresh PRs locally
          await get().loadPersonalRecords();

          if (notificationToShow && get().persistedUserId === requestedOwnerId) {
            set({ notification: notificationToShow });
          }
        } catch {
          // Completion is already terminal; background refresh failure must not change the result.
        }

        return finishResult;
      },

      clearActiveWorkout: () =>
        set((state) => ({ activeWorkout: null, persistedUserId: state.persistedUserId })),

      pauseWorkout: () => {
        const state = get();
        if (state.activeWorkout && !state.activeWorkout.isPaused) {
          set({
            activeWorkout: {
              ...state.activeWorkout,
              isPaused: true,
              pausedAt: new Date().toISOString(),
            },
          });
          void get().saveActiveWorkoutProgress();
        }
      },

      resumeWorkout: () => {
        const state = get();
        if (state.activeWorkout && state.activeWorkout.isPaused && state.activeWorkout.pausedAt) {
          const pausedDuration =
            new Date().getTime() - new Date(state.activeWorkout.pausedAt).getTime();
          const currentPausedMs = state.activeWorkout.totalPausedMs || 0;

          set({
            activeWorkout: {
              ...state.activeWorkout,
              isPaused: false,
              pausedAt: undefined,
              totalPausedMs: currentPausedMs + pausedDuration,
            },
          });
          void get().saveActiveWorkoutProgress();
        }
      },

      cancelWorkout: async () => {
        const state = get();
        if (!state.activeWorkout) return;

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user && state.activeWorkout.id) {
            // Delete from active_workouts table
            await supabase.from('active_workouts').delete().eq('id', state.activeWorkout.id);
          }

          // Clear local state
          set({ activeWorkout: null, persistedUserId: user?.id || null });
        } catch (error) {
          console.error('Error cancelling workout:', error);
        }
      },

      // Body Measurements Functions
      loadBodyMeasurements: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'user');
        if (!user) return context ? result : undefined;

        const { data, error } = await supabase
          .from('body_measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true }); // Ascending for charts

        if (context && error) return REQUEST_FAILED;
        if (staleAfterRequest(context)) return STALE;
        if (error || !data) return;

        set({ bodyMeasurements: data });
        return completeLoad(context);
      },

      addBodyMeasurement: async (measurement) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('body_measurements')
          .insert([{ ...measurement, user_id: user.id }]);

        if (!error) {
          await get().loadBodyMeasurements();
        }
      },

      deleteBodyMeasurement: async (id: string) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('body_measurements')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (!error) {
          await get().loadBodyMeasurements();
        }
      },

      // Personal Records Implementation

      loadPersonalRecords: async (context?: LoadContext) => {
        const { user, result } = await resolveLoadUser(context, 'user');
        if (!user) return context ? result : undefined;

        const { data, error } = await supabase
          .from('personal_records')
          .select('exercise_name, weight, reps, date')
          .eq('user_id', user.id);

        const missingTable = isMissingPersonalRecordsTable(error);
        if (error && !missingTable) return context ? REQUEST_FAILED : undefined;
        if (staleAfterRequest(context)) return STALE;

        if (missingTable) {
          const { data: history, error: historyError } = await supabase
            .from('workout_sessions')
            .select('completed_at, exercises_completed')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: true });

          if (historyError || !history) return context ? REQUEST_FAILED : undefined;
          if (staleAfterRequest(context)) return STALE;

          set({ personalRecords: deriveLegacyPersonalRecords(history) });
          return completeLoad(context);
        }

        if (data) {
          const records: Record<string, { weight: number; reps: number; date: string }> = {};
          data.forEach((r) => {
            records[r.exercise_name] = { weight: r.weight, reps: r.reps, date: r.date };
          });
          set({ personalRecords: records });
          return completeLoad(context);
        }
      },

      dismissNotification: () => set({ notification: null }),

      syncPersonalRecords: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // 1. Fetch ALL workout history
          const { data: history, error } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: true });

          if (error || !history) return;

          // 2. Recalculate PRs
          const recalculatedPRs = deriveLegacyPersonalRecords(history);

          // 3. Keep the history-derived records available even when the optional
          // persistence table is absent or temporarily unavailable.
          set({
            personalRecords: recalculatedPRs,
          });

          const { error: deleteError } = await supabase
            .from('personal_records')
            .delete()
            .eq('user_id', user.id);

          if (isMissingPersonalRecordsTable(deleteError)) return;
          if (deleteError) throw deleteError;

          if (Object.keys(recalculatedPRs).length > 0) {
            const prsToInsert = Object.entries(recalculatedPRs).map(([name, data]) => ({
              user_id: user.id,
              exercise_name: name,
              weight: data.weight,
              reps: data.reps,
              date: data.date,
            }));
            const { error: insertError } = await supabase
              .from('personal_records')
              .insert(prsToInsert);
            if (insertError) throw insertError;
          }
        } catch (err) {
          console.error('Error syncing PRs:', err);
        }
      },
    }),
    {
      name: 'fitness-app-storage',
      partialize: (state) => ({
        routineName: state.routineName,
        exercises: state.exercises,
        onboardingData: state.onboardingData,
        exerciseLibrary: state.exerciseLibrary,
        selectedMuscleFilter: state.selectedMuscleFilter,
        selectedEquipmentFilter: state.selectedEquipmentFilter,
        exerciseSearchQuery: state.exerciseSearchQuery,
        activeWorkout: state.activeWorkout,
        persistedUserId: state.persistedUserId,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }

        const typedPersistedState = persistedState as Partial<AppState>;
        const persistedActiveWorkout = typedPersistedState.activeWorkout
          ? {
              ...typedPersistedState.activeWorkout,
              exercises: normalizeActiveWorkoutExercises(
                Array.isArray(typedPersistedState.activeWorkout.exercises)
                  ? typedPersistedState.activeWorkout.exercises
                  : []
              ),
            }
          : currentState.activeWorkout;
        return {
          ...currentState,
          routineName: typedPersistedState.routineName ?? currentState.routineName,
          exercises: typedPersistedState.exercises ?? currentState.exercises,
          onboardingData: typedPersistedState.onboardingData ?? currentState.onboardingData,
          exerciseLibrary: typedPersistedState.exerciseLibrary ?? currentState.exerciseLibrary,
          selectedMuscleFilter:
            typedPersistedState.selectedMuscleFilter ?? currentState.selectedMuscleFilter,
          selectedEquipmentFilter:
            typedPersistedState.selectedEquipmentFilter ?? currentState.selectedEquipmentFilter,
          exerciseSearchQuery:
            typedPersistedState.exerciseSearchQuery ?? currentState.exerciseSearchQuery,
          activeWorkout: persistedActiveWorkout,
          persistedUserId: typedPersistedState.persistedUserId ?? currentState.persistedUserId,
        };
      },
    }
  )
);
