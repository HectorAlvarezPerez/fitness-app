export type MuscleExerciseLike = {
  primaryMuscle?: string;
  primary_muscle?: string;
  muscleGroup?: string;
  secondaryMuscles?: string[];
  secondary_muscles?: string[];
  secondaryMuscleFactor?: number;
  secondary_muscle_factor?: number;
  sets?: Array<unknown> | number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const normalizeMuscleName = (rawMuscle: string) => {
  const muscle = rawMuscle.toLowerCase();

  if (muscle.includes('pecho') || muscle.includes('chest')) return 'pecho';
  if (muscle.includes('espald') || muscle.includes('back') || muscle.includes('dorsal')) return 'espalda';
  if (muscle.includes('hombro') || muscle.includes('shoulder') || muscle.includes('deltoid')) return 'hombros';
  if (muscle.includes('biceps') || muscle.includes('bíceps')) return 'biceps';
  if (muscle.includes('triceps') || muscle.includes('tríceps')) return 'triceps';
  if (muscle.includes('cuad') || muscle.includes('quad')) return 'cuadriceps';
  if (muscle.includes('femoral') || muscle.includes('isquio') || muscle.includes('hamstring')) return 'isquios';
  if (muscle.includes('gemel') || muscle.includes('calves')) return 'gemelos';
  if (muscle.includes('glut') || muscle.includes('glutes')) return 'gluteos';
  if (muscle.includes('abdo') || muscle.includes('core')) return 'abs';
  if (muscle.includes('trapec') || muscle.includes('trap')) return 'trapecios';
  if (muscle.includes('antebraz') || muscle.includes('forearm')) return 'antebrazos';
  if (muscle.includes('lumbar') || muscle.includes('lower_back')) return 'lumbares';

  return muscle;
};

export const getExerciseSeriesCount = (exercise: MuscleExerciseLike) => {
  if (Array.isArray(exercise.sets)) return exercise.sets.length;
  if (typeof exercise.sets === 'number') return exercise.sets;
  return 0;
};

export const accumulateMuscleSeriesDistribution = (
  exercises: MuscleExerciseLike[],
  defaultSecondaryFactor = 0.35
) => {
  const distribution: Record<string, number> = {};

  exercises.forEach((exercise) => {
    const seriesCount = getExerciseSeriesCount(exercise);
    if (seriesCount <= 0) return;

    const primaryRaw = exercise.primaryMuscle || exercise.primary_muscle || exercise.muscleGroup || '';
    const primary = primaryRaw ? normalizeMuscleName(primaryRaw) : '';
    if (!primary) return;

    const secondaryMuscles = (exercise.secondaryMuscles || exercise.secondary_muscles || [])
      .filter(Boolean)
      .map((muscle) => normalizeMuscleName(muscle));

    const rawFactor =
      exercise.secondaryMuscleFactor ??
      exercise.secondary_muscle_factor ??
      (secondaryMuscles.length > 0 ? defaultSecondaryFactor : 0);
    const factor = clamp01(rawFactor);

    if (secondaryMuscles.length === 0 || factor === 0) {
      distribution[primary] = (distribution[primary] || 0) + seriesCount;
      return;
    }

    const primaryContribution = seriesCount * (1 - factor);
    distribution[primary] = (distribution[primary] || 0) + primaryContribution;

    const secondaryContributionPerMuscle = (seriesCount * factor) / secondaryMuscles.length;
    secondaryMuscles.forEach((secondaryMuscle) => {
      distribution[secondaryMuscle] =
        (distribution[secondaryMuscle] || 0) + secondaryContributionPerMuscle;
    });
  });

  return distribution;
};

