import { describe, expect, it } from 'vitest';
import {
  formatCardioDuration,
  formatPace,
  getActivityTypeFromLibraryExercise,
  getCardioMetricsFromSet,
  getCardioProgressPoints,
  isCardioExercise,
  sanitizeCardioMetrics,
  summarizeCardioProgress,
} from './trainingMetrics';

describe('trainingMetrics', () => {
  it('sanitizes cardio inputs and clamps unsafe values', () => {
    expect(
      sanitizeCardioMetrics({
        durationSeconds: 3661.8,
        distanceKm: -2,
        averageHeartRateBpm: 999,
        rpe: 12,
        modality: 'run',
      })
    ).toEqual({
      modality: 'run',
      durationSeconds: 3662,
      distanceKm: 0,
      averageHeartRateBpm: 260,
      rpe: 10,
    });
  });

  it('keeps legacy time/reps as cardio duration when no metrics were stored', () => {
    expect(getCardioMetricsFromSet({ reps: 2400 })).toEqual({ durationSeconds: 2400 });
  });

  it('aggregates completed cardio sessions and derives pace', () => {
    const points = getCardioProgressPoints([
      {
        completed_at: '2026-08-01T10:00:00.000Z',
        exercises_completed: [
          {
            name: 'Correr en Cinta',
            trackingType: 'time',
            sets: [
              {
                completed: true,
                reps: 1800,
                cardioMetrics: { distanceKm: 3, averageHeartRateBpm: 145, rpe: 5 },
              },
            ],
          },
        ],
      },
    ]);

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      durationSeconds: 1800,
      distanceKm: 3,
      paceSecondsPerKm: 600,
      averageHeartRateBpm: 145,
      rpe: 5,
    });
    expect(summarizeCardioProgress(points)).toMatchObject({
      sessions: 1,
      durationSeconds: 1800,
      distanceKm: 3,
      averagePaceSecondsPerKm: 600,
    });
  });

  it('formats duration and pace for the UI', () => {
    expect(formatCardioDuration(3661)).toBe('61:01');
    expect(formatCardioDuration(59.6)).toBe('1:00');
    expect(formatPace(305)).toBe('5:05 /km');
    expect(formatPace(299.6)).toBe('5:00 /km');
    expect(formatPace(undefined)).toBe('—');
  });

  it('does not classify a time-based core exercise as cardio when it is explicit strength', () => {
    expect(
      isCardioExercise({
        name: 'Plancha',
        primaryMuscle: 'Core',
        activityType: 'strength',
        trackingType: 'time',
      })
    ).toBe(false);
  });

  it('uses library category/muscle instead of tracking type for activity classification', () => {
    expect(
      getActivityTypeFromLibraryExercise({
        category: 'Strength',
        primary_muscle: 'Core',
      })
    ).toBe('strength');
    expect(
      getActivityTypeFromLibraryExercise({
        category: 'Cardio',
        primary_muscle: 'Cardio',
      })
    ).toBe('cardio');
  });

  it('does not add planned but untouched cardio sets to progression', () => {
    expect(
      getCardioProgressPoints([
        {
          completed_at: '2026-08-02T10:00:00.000Z',
          exercises_completed: [
            {
              name: 'Correr en Cinta',
              activityType: 'cardio',
              trackingType: 'time',
              sets: [{ completed: false, reps: 2400 }],
            },
          ],
        },
      ])
    ).toEqual([]);
  });
});
