export type WorkoutSessionLike = {
  exercises_completed?: Array<{
    sets?: Array<{ completed?: boolean }>;
  }> | null;
};

export type WorkoutExerciseLike = {
  name?: string;
  sets?: Array<{ reps?: number; weight?: number }>;
};

export type WorkoutHistoryEntryLike = {
  exercises_completed?: WorkoutExerciseLike[] | null;
};

export const getSetCompletionCounts = (workout: WorkoutSessionLike) => {
  const exercises = Array.isArray(workout.exercises_completed) ? workout.exercises_completed : [];
  let totalSets = 0;
  let completedSets = 0;

  exercises.forEach((exercise) => {
    if (!Array.isArray(exercise.sets)) return;
    totalSets += exercise.sets.length;
    completedSets += exercise.sets.filter((set) => set.completed).length;
  });

  return { totalSets, completedSets };
};

export const isPartialWorkout = (workout: WorkoutSessionLike) => {
  const { totalSets, completedSets } = getSetCompletionCounts(workout);
  return totalSets > 0 && completedSets < totalSets;
};

export const buildLastPerformanceMap = (history: WorkoutHistoryEntryLike[]) => {
  const map: Record<string, WorkoutExerciseLike> = {};

  history.forEach((session) => {
    if (!Array.isArray(session.exercises_completed)) return;
    session.exercises_completed.forEach((exercise) => {
      if (!exercise.name) return;
      if (!map[exercise.name]) {
        map[exercise.name] = exercise;
      }
    });
  });

  return map;
};
