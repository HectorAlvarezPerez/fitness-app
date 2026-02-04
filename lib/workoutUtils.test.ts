import { describe, expect, it } from 'vitest';
import { buildLastPerformanceMap, getSetCompletionCounts, isPartialWorkout } from './workoutUtils';

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

  it('builds last performance map from history', () => {
    const history = [
      {
        exercises_completed: [
          { name: 'Squat', sets: [{ reps: 5, weight: 100 }] },
          { name: 'Bench', sets: [{ reps: 8, weight: 80 }] },
        ],
      },
      {
        exercises_completed: [
          { name: 'Squat', sets: [{ reps: 3, weight: 110 }] },
        ],
      },
    ];

    const map = buildLastPerformanceMap(history);
    expect(map.Squat?.sets?.[0]?.weight).toBe(100);
    expect(map.Bench?.sets?.[0]?.reps).toBe(8);
  });
});
