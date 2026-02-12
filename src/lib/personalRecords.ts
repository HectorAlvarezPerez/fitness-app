export type PersonalRecordTypeFilter = 'all' | 'strength' | 'reps' | 'time';

export type PersonalRecordSort =
  | 'e1rm_desc'
  | 'reps_desc'
  | 'time_desc'
  | 'updated_desc'
  | 'name_asc';

export type PersistedPersonalRecord = {
  weight: number;
  reps: number;
  date: string;
};

export type WorkoutSetLike = {
  reps?: number;
  weight?: number;
  completed?: boolean;
};

export type WorkoutExerciseLike = {
  name?: string;
  trackingType?: 'reps' | 'time';
  sets?: WorkoutSetLike[];
};

export type WorkoutHistoryLike = {
  completed_at: string;
  exercises_completed?: WorkoutExerciseLike[] | null;
};

export type ExerciseMetadataLike = {
  id?: string;
  name?: string;
  primary_muscle?: string;
  equipment?: string;
  tracking_type?: 'reps' | 'time';
};

export type PersonalRecordRow = {
  exerciseKey: string;
  exerciseId?: string;
  exerciseName: string;
  primaryMuscle?: string;
  equipment?: string;
  bestE1RM?: number;
  bestReps?: number;
  bestTimeSeconds?: number;
  updatedAt?: string;
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const parseDateMs = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return value;
};

export const roundToHalf = (value: number) => Math.round(value * 2) / 2;

export const calculateE1RM = (weight: number, reps: number) => {
  if (weight <= 0 || reps <= 0) return 0;
  const e1rm = weight * (1 + reps / 30);
  return roundToHalf(e1rm);
};

const shouldUseSet = (set: WorkoutSetLike) => set.completed !== false;

const hasValue = (value?: number) => typeof value === 'number' && value > 0;

export const derivePersonalRecordRows = (
  history: WorkoutHistoryLike[],
  exerciseMetadata: ExerciseMetadataLike[],
  persistedRecords: Record<string, PersistedPersonalRecord> = {}
) => {
  const metadataByKey = new Map<string, ExerciseMetadataLike>();
  exerciseMetadata.forEach((exercise) => {
    if (!exercise?.name) return;
    const key = normalizeName(exercise.name);
    if (!metadataByKey.has(key)) {
      metadataByKey.set(key, exercise);
    }
  });

  const rows = new Map<string, PersonalRecordRow>();

  const getOrCreateRow = (exerciseName: string) => {
    const exerciseKey = normalizeName(exerciseName);
    const existing = rows.get(exerciseKey);
    if (existing) return existing;

    const metadata = metadataByKey.get(exerciseKey);
    const nextRow: PersonalRecordRow = {
      exerciseKey,
      exerciseId: metadata?.id,
      exerciseName: metadata?.name || exerciseName,
      primaryMuscle: metadata?.primary_muscle,
      equipment: metadata?.equipment,
    };
    rows.set(exerciseKey, nextRow);
    return nextRow;
  };

  Object.entries(persistedRecords).forEach(([exerciseName, record]) => {
    if (!exerciseName) return;
    const row = getOrCreateRow(exerciseName);
    const weight = asNumber(record?.weight);
    const reps = Math.round(asNumber(record?.reps));
    const e1rm = calculateE1RM(weight, reps);

    if (hasValue(e1rm) && (!hasValue(row.bestE1RM) || e1rm > (row.bestE1RM || 0))) {
      row.bestE1RM = e1rm;
    }

    if (hasValue(reps) && (!hasValue(row.bestReps) || reps > (row.bestReps || 0))) {
      row.bestReps = reps;
    }

    if (parseDateMs(record?.date) > parseDateMs(row.updatedAt)) {
      row.updatedAt = record.date;
    }
  });

  history.forEach((session) => {
    const sessionDate = session.completed_at;
    if (!Array.isArray(session.exercises_completed)) return;

    session.exercises_completed.forEach((exercise) => {
      if (!exercise?.name || !Array.isArray(exercise.sets)) return;

      const row = getOrCreateRow(exercise.name);
      const metadata = metadataByKey.get(row.exerciseKey);
      const isTimeExercise = exercise.trackingType === 'time' || metadata?.tracking_type === 'time';

      exercise.sets.forEach((set) => {
        if (!shouldUseSet(set)) return;

        const reps = Math.round(asNumber(set.reps));
        const weight = asNumber(set.weight);

        if (isTimeExercise) {
          if (hasValue(reps) && (!hasValue(row.bestTimeSeconds) || reps > (row.bestTimeSeconds || 0))) {
            row.bestTimeSeconds = reps;
            if (parseDateMs(sessionDate) > parseDateMs(row.updatedAt)) {
              row.updatedAt = sessionDate;
            }
          }
          return;
        }

        if (hasValue(reps) && (!hasValue(row.bestReps) || reps > (row.bestReps || 0))) {
          row.bestReps = reps;
          if (parseDateMs(sessionDate) > parseDateMs(row.updatedAt)) {
            row.updatedAt = sessionDate;
          }
        }

        const e1rm = calculateE1RM(weight, reps);
        if (hasValue(e1rm) && (!hasValue(row.bestE1RM) || e1rm > (row.bestE1RM || 0))) {
          row.bestE1RM = e1rm;
          if (parseDateMs(sessionDate) > parseDateMs(row.updatedAt)) {
            row.updatedAt = sessionDate;
          }
        }
      });
    });
  });

  return Array.from(rows.values()).filter(
    (row) => hasValue(row.bestE1RM) || hasValue(row.bestReps) || hasValue(row.bestTimeSeconds)
  );
};

const byName = (a: PersonalRecordRow, b: PersonalRecordRow) =>
  a.exerciseName.localeCompare(b.exerciseName, 'es', { sensitivity: 'base' });

export const filterAndSortPersonalRecordRows = (
  rows: PersonalRecordRow[],
  options: {
    searchQuery: string;
    prType: PersonalRecordTypeFilter;
    sortBy: PersonalRecordSort;
  }
) => {
  const normalizedQuery = normalizeName(options.searchQuery || '');

  const filtered = rows.filter((row) => {
    if (normalizedQuery && !normalizeName(row.exerciseName).includes(normalizedQuery)) {
      return false;
    }

    if (options.prType === 'strength') return hasValue(row.bestE1RM);
    if (options.prType === 'reps') return hasValue(row.bestReps);
    if (options.prType === 'time') return hasValue(row.bestTimeSeconds);
    return true;
  });

  const sorted = [...filtered];

  if (options.sortBy === 'e1rm_desc') {
    sorted.sort((a, b) => (b.bestE1RM || -1) - (a.bestE1RM || -1) || byName(a, b));
    return sorted;
  }

  if (options.sortBy === 'reps_desc') {
    sorted.sort((a, b) => (b.bestReps || -1) - (a.bestReps || -1) || byName(a, b));
    return sorted;
  }

  if (options.sortBy === 'time_desc') {
    sorted.sort((a, b) => (b.bestTimeSeconds || -1) - (a.bestTimeSeconds || -1) || byName(a, b));
    return sorted;
  }

  if (options.sortBy === 'updated_desc') {
    sorted.sort((a, b) => parseDateMs(b.updatedAt) - parseDateMs(a.updatedAt) || byName(a, b));
    return sorted;
  }

  sorted.sort(byName);
  return sorted;
};

export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
