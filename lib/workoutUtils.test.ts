import { describe, expect, it } from 'vitest';
import { getSetCompletionCounts, isPartialWorkout } from './workoutUtils';

describe('workoutUtils', () => {
  it('detects partial workouts', () => {
    const workout = {
      exercises_completed: [
        { sets: [{ completed: true }, { completed: false }] },
      ],
    };

    const counts = getSetCompletionCounts(workout);
    expect(counts.totalSets).toBe(2);
    expect(counts.completedSets).toBe(1);
    expect(isPartialWorkout(workout)).toBe(true);
  });

  it('detects completed workouts', () => {
    const workout = {
      exercises_completed: [
        { sets: [{ completed: true }, { completed: true }] },
      ],
    };

    expect(isPartialWorkout(workout)).toBe(false);
  });

  it('handles workouts without sets', () => {
    const workout = {
      exercises_completed: [],
    };

    const counts = getSetCompletionCounts(workout);
    expect(counts.totalSets).toBe(0);
    expect(counts.completedSets).toBe(0);
    expect(isPartialWorkout(workout)).toBe(false);
  });
});
