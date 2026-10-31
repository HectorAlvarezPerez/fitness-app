import { useSyncExternalStore } from 'react';

const noop = () => undefined;
const success = async () => ({ ok: true });
const successBool = async () => true;
const listeners = new Set<() => void>();
let version = 0;
const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getVersion = () => version;

const routine = {
  id: 'preview-push-pull',
  user_id: 'preview-user',
  name: 'Torso A · Push & Pull',
  folder_id: 'preview-strength',
  created_at: '2026-09-20T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  exercises: [
    {
      id: 'preview-bench',
      name: 'Press banca con barra',
      muscleGroup: 'Pecho',
      sets: [
        { id: 'set-1', reps: 8, weight: 60, rir: 2 },
        { id: 'set-2', reps: 8, weight: 60, rir: 2 },
        { id: 'set-3', reps: 8, weight: 60, rir: 2 },
      ],
      restSeconds: 120,
      prescription: { repMin: 8, repMax: 10, rirMin: 1, rirMax: 2 },
    },
    {
      id: 'preview-row',
      name: 'Remo con mancuerna',
      muscleGroup: 'Espalda',
      sets: [
        { id: 'row-1', reps: 10, weight: 24 },
        { id: 'row-2', reps: 10, weight: 24 },
        { id: 'row-3', reps: 10, weight: 24 },
      ],
      restSeconds: 90,
    },
    {
      id: 'preview-run',
      name: 'Cinta · carrera suave',
      muscleGroup: 'Cardio',
      activityType: 'cardio',
      trackingType: 'time',
      sets: [{ id: 'run-1', reps: 900, weight: 0, cardioMetrics: { durationSeconds: 900 } }],
      restSeconds: 30,
    },
  ],
};

const history = {
  id: 'preview-history-1',
  user_id: 'preview-user',
  routine_id: routine.id,
  routine_name: routine.name,
  started_at: '2026-10-02T17:20:00.000Z',
  completed_at: '2026-10-02T18:14:00.000Z',
  exercises_completed: [
    {
      name: 'Press banca con barra',
      primaryMuscle: 'Pecho',
      sets: [
        { reps: 8, weight: 60, completed: true, rir: 2 },
        { reps: 8, weight: 60, completed: true, rir: 1 },
      ],
    },
  ],
  total_volume: 6420,
  duration_minutes: 54,
};

const activeWorkout = {
  id: 'preview-active-workout',
  routineId: routine.id,
  routineName: routine.name,
  startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  currentExerciseId: 'preview-bench',
  currentSetIndex: 1,
  restTimer: null,
  exercises: [
    {
      exerciseId: 'preview-bench',
      name: 'Press banca con barra',
      primaryMuscle: 'Pecho',
      restSeconds: 120,
      notes: 'Controla la bajada',
      sets: [
        { id: 'active-1', reps: 8, weight: 60, completed: true, rir: 2 },
        { id: 'active-2', reps: 8, weight: 60, completed: false, rir: 2 },
        { id: 'active-3', reps: 8, weight: 60, completed: false, rir: 2 },
      ],
      prescription: { repMin: 8, repMax: 10, rirMin: 1, rirMax: 2 },
    },
    {
      exerciseId: 'preview-run',
      name: 'Cinta · carrera suave',
      primaryMuscle: 'Cardio',
      activityType: 'cardio',
      trackingType: 'time',
      restSeconds: 30,
      sets: [
        {
          id: 'active-run-1',
          reps: 900,
          weight: 0,
          completed: false,
          cardioMetrics: { durationSeconds: 900 },
        },
      ],
    },
  ],
};

const previewState = {
  userData: { id: 'preview-user', email: 'demo@example.test', user_metadata: { full_name: 'Alex' } },
  persistedUserId: 'preview-user',
  onboardingData: {
    level: 'Intermedio',
    mainGoal: 'Fuerza',
    weight: 78,
    height: 178,
    trainingDays: 4,
    conditions: ['Ninguna'],
  },
  savedRoutines: [routine],
  routineFolders: [
    {
      id: 'preview-strength',
      user_id: 'preview-user',
      name: 'Fuerza',
      color: '#2563eb',
      order_index: 0,
      created_at: routine.created_at,
      updated_at: routine.updated_at,
    },
    {
      id: 'preview-cardio', user_id: 'preview-user', name: 'Cardio', color: '#ef4444',
      order_index: 1, created_at: routine.created_at, updated_at: routine.updated_at,
    },
    {
      id: 'preview-mobility', user_id: 'preview-user', name: 'Movilidad', color: '#22c55e',
      order_index: 2, created_at: routine.created_at, updated_at: routine.updated_at,
    },
  ],
  workoutHistory: [history],
  activeWorkout,
  notification: null,
  exerciseLibrary: [
    {
      id: 'preview-bench',
      name: 'Press banca con barra',
      primary_muscle: 'Pecho',
      secondary_muscles: ['Tríceps', 'Hombros'],
      equipment: 'Barra',
      category: 'Fuerza',
      tracking_type: 'reps',
      instructions: 'Apoya los pies, controla el descenso y empuja con estabilidad.',
      user_id: 'preview-user',
    },
    {
      id: 'preview-row',
      name: 'Remo con mancuerna',
      primary_muscle: 'Espalda',
      secondary_muscles: ['Bíceps'],
      equipment: 'Mancuerna',
      category: 'Fuerza',
      tracking_type: 'reps',
      instructions: 'Mantén la espalda estable y lleva el codo hacia la cadera.',
      user_id: 'preview-user',
    },
  ],
  stats: { recovery: 83, totalVolume: 6420, consistency: 67, streak: 2 },
  bodyMeasurements: [
    {
      id: 'preview-measurement-1',
      user_id: 'preview-user',
      date: '2026-09-19',
      weight: 78.4,
      chest: 101,
      waist: 84,
      created_at: '2026-09-19T09:00:00.000Z',
    },
    {
      id: 'preview-measurement-2',
      user_id: 'preview-user',
      date: '2026-10-02',
      weight: 78,
      chest: 101.5,
      waist: 83.5,
      created_at: '2026-10-02T09:00:00.000Z',
    },
  ],
  personalRecords: {
    'Press banca con barra': { weight: 60, reps: 8, date: '2026-10-02' },
  },
  routineName: routine.name,
  exercises: routine.exercises,
  currentRoutineId: routine.id,
  selectedMuscleFilter: null,
  selectedEquipmentFilter: null,
  exerciseSearchQuery: '',
  loadUserData: success,
  updateOnboardingData: noop,
  setRoutineName: noop,
  setExercises: (exercises: typeof routine.exercises) => {
    previewState.exercises = exercises;
    notify();
  },
  addExercise: noop,
  updateExercise: noop,
  removeExercise: noop,
  saveRoutine: successBool,
  loadWorkoutHistory: success,
  loadActiveWorkout: success,
  loadRoutines: success,
  loadFolders: success,
  loadExerciseLibrary: success,
  loadUserStats: success,
  loadPersonalRecords: success,
  loadBodyMeasurements: success,
  addBodyMeasurement: successBool,
  deleteBodyMeasurement: successBool,
  loadProgressData: success,
  loadMuscleStats: success,
  loadTrainingPlan: success,
  deleteRoutine: successBool,
  createFolder: successBool,
  updateFolder: successBool,
  reorderFolders: async (folderIds: string[]) => {
    const foldersById = new Map(previewState.routineFolders.map((folder) => [folder.id, folder]));
    if (folderIds.length !== foldersById.size || new Set(folderIds).size !== foldersById.size ||
      folderIds.some((id) => !foldersById.has(id))) return false;
    previewState.routineFolders = folderIds.map((id, index) => ({ ...foldersById.get(id)!, order_index: index }));
    notify();
    return true;
  },
  deleteFolder: successBool,
  moveRoutineToFolder: successBool,
  duplicateRoutine: successBool,
  installTrainingPlan: async () => ({ ok: true, created: 0, skipped: 0 }),
  startWorkout: successBool,
  startEmptyWorkout: successBool,
  addActiveWorkoutExercise: successBool,
  updateActiveWorkoutExerciseNotes: noop,
  updateActiveWorkoutExerciseRest: noop,
  setActiveExerciseSuperset: successBool,
  removeActiveWorkoutExercise: successBool,
  reorderActiveWorkoutExercises: async (activeId: string, overId: string) => {
    const exercises = [...previewState.activeWorkout.exercises];
    const from = exercises.findIndex((exercise) => exercise.exerciseId === activeId);
    const to = exercises.findIndex((exercise) => exercise.exerciseId === overId);
    if (from < 0 || to < 0) return false;
    if (from === to) return true;
    const [moved] = exercises.splice(from, 1);
    exercises.splice(to, 0, moved);
    previewState.activeWorkout = { ...previewState.activeWorkout, exercises };
    notify();
    return true;
  },
  updateWorkoutExerciseSets: noop,
  setActiveWorkoutPosition: noop,
  startRestTimer: noop,
  clearRestTimer: noop,
  pauseRestTimer: noop,
  resumeRestTimer: noop,
  extendRestTimer: noop,
  finishWorkout: async () => ({ ok: true }),
  updateRoutineFromWorkout: successBool,
  cancelWorkout: successBool,
  deleteWorkoutSession: noop,
  deleteWorkoutSessions: noop,
  setMuscleFilter: noop,
  setEquipmentFilter: noop,
  setExerciseSearchQuery: noop,
  getFilteredExercises: () => [
    {
      id: 'preview-library-bench',
      name: 'Press banca con barra',
      primary_muscle: 'Pecho',
      secondary_muscles: ['Tríceps', 'Hombros'],
      equipment: 'Barra',
      category: 'Fuerza',
      tracking_type: 'reps',
    },
    {
      id: 'preview-library-row',
      name: 'Remo con mancuerna',
      primary_muscle: 'Espalda',
      secondary_muscles: ['Bíceps'],
      equipment: 'Mancuerna',
      category: 'Fuerza',
      tracking_type: 'reps',
    },
  ],
  dismissNotification: noop,
};

type PreviewStoreHook = {
  <T = typeof previewState>(selector?: (state: typeof previewState) => T): T;
  getState: () => typeof previewState;
};

const previewHook = ((selector?: (state: typeof previewState) => unknown) => {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return selector ? selector(previewState) : previewState;
}) as PreviewStoreHook;
Object.assign(previewHook, { getState: () => previewState });

export const useStore = previewHook;
export const previewExercises = previewState.exerciseLibrary;
