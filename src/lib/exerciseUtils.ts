export type ExerciseNameEntry = {
  id: string;
  name: string;
};

export type ExercisePayloadInput = {
  name?: string;
  primary_muscle?: string;
  secondary_muscles?: unknown;
  equipment?: string;
  category?: string;
  instructions?: string | null;
  tracking_type?: 'reps' | 'time' | string;
};

export const normalizeExerciseName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const validateExerciseName = (
  rawName: string,
  existingExercises: ExerciseNameEntry[],
  excludeId?: string
) => {
  const trimmedName = rawName.trim();
  if (!trimmedName) return { trimmedName, error: 'Name is required' };
  if (trimmedName.length > 120) return { trimmedName, error: 'Name is too long' };

  const duplicate = existingExercises.find(
    (exercise) =>
      exercise.id !== excludeId &&
      normalizeExerciseName(exercise.name || '') === normalizeExerciseName(trimmedName)
  );

  if (duplicate) {
    return { trimmedName, error: 'Exercise with this name already exists' };
  }

  return { trimmedName, error: null };
};

export const canEditExercise = (exerciseUserId: string | null | undefined, currentUserId?: string | null) => {
  if (!exerciseUserId) return true;
  if (!currentUserId) return false;
  return exerciseUserId === currentUserId;
};

export const buildExercisePayload = (input: ExercisePayloadInput) => ({
  name: typeof input.name === 'string' ? input.name.trim() : '',
  primary_muscle: typeof input.primary_muscle === 'string' ? input.primary_muscle : 'Full Body',
  secondary_muscles: Array.isArray(input.secondary_muscles)
    ? input.secondary_muscles.filter((item): item is string => typeof item === 'string')
    : [],
  equipment: typeof input.equipment === 'string' ? input.equipment : 'Other',
  category: typeof input.category === 'string' ? input.category : 'Strength',
  instructions: typeof input.instructions === 'string' ? input.instructions.trim() || null : null,
  tracking_type: input.tracking_type === 'time' ? 'time' : 'reps',
});

export const isMissingUserIdColumnError = (message: string) =>
  message.includes('user_id') && message.toLowerCase().includes('column');
