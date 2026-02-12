import { describe, expect, it } from 'vitest';
import {
  buildExercisePayload,
  canEditExercise,
  validateExerciseName,
} from './exerciseUtils';

describe('exerciseUtils', () => {
  it('validates name rules and duplicate names', () => {
    const existing = [
      { id: '1', name: 'Bench Press' },
      { id: '2', name: 'Sentadilla' },
    ];

    expect(validateExerciseName('', existing).error).toBe('Name is required');
    expect(validateExerciseName('A'.repeat(121), existing).error).toBe('Name is too long');
    expect(validateExerciseName('  bench press  ', existing).error).toBe(
      'Exercise with this name already exists'
    );
    expect(validateExerciseName('Sentadílla', existing).error).toBe(
      'Exercise with this name already exists'
    );
    expect(validateExerciseName('Deadlift', existing).error).toBeNull();
  });

  it('checks ownership before edit', () => {
    expect(canEditExercise(null, 'user-1')).toBe(true);
    expect(canEditExercise(undefined, 'user-1')).toBe(true);
    expect(canEditExercise('user-1', 'user-1')).toBe(true);
    expect(canEditExercise('user-2', 'user-1')).toBe(false);
    expect(canEditExercise('user-2', null)).toBe(false);
  });

  it('builds payload with defaults and sanitized values', () => {
    const payload = buildExercisePayload({
      name: '  Pull Up  ',
      primary_muscle: 'Espalda',
      secondary_muscles: ['Bíceps', 123, null],
      instructions: '  Keep your core tight.  ',
      tracking_type: 'time',
    });

    expect(payload).toEqual({
      name: 'Pull Up',
      primary_muscle: 'Espalda',
      secondary_muscles: ['Bíceps'],
      equipment: 'Other',
      category: 'Strength',
      instructions: 'Keep your core tight.',
      tracking_type: 'time',
    });
  });
});
