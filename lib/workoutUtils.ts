export type WorkoutSessionLike = {
  exercises_completed?: Array<{
    sets?: Array<{ completed?: boolean }>;
  }> | null;
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
