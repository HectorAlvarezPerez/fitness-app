export type CardioModality = 'run' | 'bike' | 'swim' | 'other';

export type CardioMetricKey =
  | 'durationSeconds'
  | 'distanceKm'
  | 'paceSecondsPerKm'
  | 'averageHeartRateBpm'
  | 'maxHeartRateBpm'
  | 'cadenceRpm'
  | 'calories'
  | 'rpe';

export interface CardioMetrics {
  modality?: CardioModality;
  durationSeconds?: number;
  distanceKm?: number;
  paceSecondsPerKm?: number;
  averageHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  cadenceRpm?: number;
  calories?: number;
  rpe?: number;
}

export interface CardioProgressPoint extends CardioMetrics {
  date: string;
  exerciseName: string;
}

export interface CardioProgressSummary {
  sessions: number;
  durationSeconds: number;
  distanceKm: number;
  averagePaceSecondsPerKm?: number;
  averageHeartRateBpm?: number;
  averageRpe?: number;
}

type UnknownRecord = Record<string, unknown>;

export type CardioHistorySetLike = {
  reps?: number;
  completed?: boolean;
  isWarmup?: boolean;
  cardioMetrics?: CardioMetrics;
};

export type CardioHistoryExerciseLike = {
  name?: string;
  primaryMuscle?: string;
  trackingType?: 'reps' | 'time';
  activityType?: 'strength' | 'cardio';
  sets?: CardioHistorySetLike[];
};

export type CardioHistorySessionLike = {
  completed_at: string;
  exercises_completed?: CardioHistoryExerciseLike[] | null;
};

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clamp = (value: unknown, min: number, max: number) => {
  if (!finite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
};

const positiveOrZero = (value: unknown, max: number) => clamp(value, 0, max);

export const sanitizeCardioMetrics = (value: unknown): CardioMetrics | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as UnknownRecord;
  const modality =
    raw.modality === 'run' ||
    raw.modality === 'bike' ||
    raw.modality === 'swim' ||
    raw.modality === 'other'
      ? raw.modality
      : undefined;
  const metrics: CardioMetrics = {
    ...(modality ? { modality } : {}),
    ...(positiveOrZero(raw.durationSeconds, 24 * 60 * 60) !== undefined
      ? { durationSeconds: Math.round(positiveOrZero(raw.durationSeconds, 24 * 60 * 60)!) }
      : {}),
    ...(positiveOrZero(raw.distanceKm, 1000) !== undefined
      ? { distanceKm: Number(positiveOrZero(raw.distanceKm, 1000)!.toFixed(3)) }
      : {}),
    ...(positiveOrZero(raw.paceSecondsPerKm, 3600) !== undefined
      ? { paceSecondsPerKm: Math.round(positiveOrZero(raw.paceSecondsPerKm, 3600)!) }
      : {}),
    ...(clamp(raw.averageHeartRateBpm, 30, 260) !== undefined
      ? { averageHeartRateBpm: Math.round(clamp(raw.averageHeartRateBpm, 30, 260)!) }
      : {}),
    ...(clamp(raw.maxHeartRateBpm, 30, 260) !== undefined
      ? { maxHeartRateBpm: Math.round(clamp(raw.maxHeartRateBpm, 30, 260)!) }
      : {}),
    ...(positiveOrZero(raw.cadenceRpm, 300) !== undefined
      ? { cadenceRpm: Math.round(positiveOrZero(raw.cadenceRpm, 300)!) }
      : {}),
    ...(positiveOrZero(raw.calories, 100000) !== undefined
      ? { calories: Math.round(positiveOrZero(raw.calories, 100000)!) }
      : {}),
    ...(clamp(raw.rpe, 0, 10) !== undefined
      ? { rpe: Number(clamp(raw.rpe, 0, 10)!.toFixed(1)) }
      : {}),
  };

  return Object.keys(metrics).length > 0 ? metrics : undefined;
};

export const getCardioMetricsFromSet = (
  set: CardioHistorySetLike | undefined
): CardioMetrics | undefined => {
  if (!set) return undefined;
  const metrics = sanitizeCardioMetrics(set.cardioMetrics);
  const durationSeconds = metrics?.durationSeconds ?? positiveOrZero(set.reps, 24 * 60 * 60);
  if (durationSeconds === undefined && !metrics) return undefined;
  return sanitizeCardioMetrics({ ...metrics, durationSeconds });
};

export const getActivityTypeFromLibraryExercise = (exercise: {
  category?: string;
  primary_muscle?: string;
}): 'strength' | 'cardio' => {
  const category = exercise.category?.trim().toLowerCase();
  const primaryMuscle = exercise.primary_muscle?.trim().toLowerCase();
  return category === 'cardio' || primaryMuscle === 'cardio' ? 'cardio' : 'strength';
};

export const isCardioExercise = (exercise: CardioHistoryExerciseLike) =>
  exercise.activityType === 'cardio' ||
  (exercise.activityType !== 'strength' &&
    exercise.trackingType === 'time' &&
    (!exercise.primaryMuscle || exercise.primaryMuscle.toLowerCase().includes('cardio')));

export const getCardioProgressPoints = (
  history: CardioHistorySessionLike[]
): CardioProgressPoint[] => {
  const points: CardioProgressPoint[] = [];
  history.forEach((session) => {
    if (!Array.isArray(session.exercises_completed)) return;
    session.exercises_completed.forEach((exercise) => {
      if (!exercise.name || !isCardioExercise(exercise) || !Array.isArray(exercise.sets)) return;
      // A finished session can contain planned but untouched sets. Only use
      // completed working sets so those planned values never become progress.
      const sets = exercise.sets.filter((set) => set.completed !== false && !set.isWarmup);
      if (sets.length === 0) return;
      const metrics = sets.reduce<CardioMetrics | undefined>((combined, set) => {
        const current = getCardioMetricsFromSet(set);
        if (!current) return combined;
        return {
          ...combined,
          ...current,
          durationSeconds:
            (combined?.durationSeconds || 0) + (current.durationSeconds || 0) || undefined,
          distanceKm: (combined?.distanceKm || 0) + (current.distanceKm || 0) || undefined,
          calories: (combined?.calories || 0) + (current.calories || 0) || undefined,
        };
      }, undefined);
      if (!metrics) return;
      const pace =
        metrics.paceSecondsPerKm ??
        (metrics.durationSeconds && metrics.distanceKm
          ? metrics.durationSeconds / metrics.distanceKm
          : undefined);
      points.push({
        ...metrics,
        ...(pace !== undefined ? { paceSecondsPerKm: Math.round(pace) } : {}),
        date: session.completed_at,
        exerciseName: exercise.name,
      });
    });
  });
  return points.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
};

export const summarizeCardioProgress = (points: CardioProgressPoint[]): CardioProgressSummary => {
  const sessions = points.length;
  const durationSeconds = points.reduce((sum, point) => sum + (point.durationSeconds || 0), 0);
  const distanceKm = points.reduce((sum, point) => sum + (point.distanceKm || 0), 0);
  const pacePoints = points.filter(
    (point): point is CardioProgressPoint & { paceSecondsPerKm: number } =>
      finite(point.paceSecondsPerKm) && point.paceSecondsPerKm > 0
  );
  const heartRatePoints = points.filter(
    (point): point is CardioProgressPoint & { averageHeartRateBpm: number } =>
      finite(point.averageHeartRateBpm)
  );
  const rpePoints = points.filter((point): point is CardioProgressPoint & { rpe: number } =>
    finite(point.rpe)
  );

  return {
    sessions,
    durationSeconds,
    distanceKm,
    ...(pacePoints.length
      ? {
          averagePaceSecondsPerKm:
            pacePoints.reduce((sum, point) => sum + point.paceSecondsPerKm, 0) / pacePoints.length,
        }
      : {}),
    ...(heartRatePoints.length
      ? {
          averageHeartRateBpm:
            heartRatePoints.reduce((sum, point) => sum + point.averageHeartRateBpm, 0) /
            heartRatePoints.length,
        }
      : {}),
    ...(rpePoints.length
      ? { averageRpe: rpePoints.reduce((sum, point) => sum + point.rpe, 0) / rpePoints.length }
      : {}),
  };
};

export const formatCardioDuration = (seconds: number | undefined) => {
  if (!finite(seconds) || seconds < 0) return '—';
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

export const formatPace = (secondsPerKm: number | undefined) => {
  if (!finite(secondsPerKm) || secondsPerKm <= 0) return '—';
  const totalSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
};
