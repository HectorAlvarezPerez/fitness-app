import { describe, expect, it } from 'vitest';
import {
  buildActiveWorkoutDataPayload,
  getActiveWorkoutPath,
  readActiveWorkoutDataPayload,
} from './activeWorkout';

describe('activeWorkout utils', () => {
  it('builds workout route for predefined and free workouts', () => {
    expect(getActiveWorkoutPath('routine-1')).toBe('/routine/routine-1/workout');
    expect(getActiveWorkoutPath(undefined)).toBe('/routine/free/workout');
  });

  it('persists and restores resumable active workout data', () => {
    const payload = buildActiveWorkoutDataPayload({
      exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 10, weight: 40 }] }],
      currentExerciseId: 'ex-1',
      currentSetIndex: 0,
      restTimer: {
        exerciseId: 'ex-1',
        setIndex: 0,
        durationSeconds: 90,
        startedAt: '2026-02-08T10:00:00.000Z',
        instanceId: 'rest-1',
      },
    });

    const restored = readActiveWorkoutDataPayload(payload);
    expect(restored.currentExerciseId).toBe('ex-1');
    expect(restored.currentSetIndex).toBe(0);
    expect(restored.restTimer?.durationSeconds).toBe(90);
    expect(restored.exercises).toHaveLength(1);
  });

  it('round-trips prescription, RIR, and cardio metrics without dropping JSONB fields', () => {
    const payload = buildActiveWorkoutDataPayload({
      exercises: [
        {
          exerciseId: 'cardio-1',
          activityType: 'cardio',
          prescription: { repMin: 30, repMax: 45, rirMin: 1, rirMax: 2 },
          cardioTargets: { modality: 'run', distanceKm: 7 },
          sets: [
            {
              reps: 2700,
              weight: 0,
              completed: true,
              cardioMetrics: { durationSeconds: 2700, distanceKm: 7.2, rpe: 4 },
              rir: 2,
            },
          ],
        },
      ],
    });

    const restored = readActiveWorkoutDataPayload(payload);
    expect(restored.exercises).toEqual(payload.exercises);
  });
});
