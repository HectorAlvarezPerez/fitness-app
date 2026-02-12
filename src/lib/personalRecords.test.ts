import { describe, expect, it } from 'vitest';
import {
  derivePersonalRecordRows,
  filterAndSortPersonalRecordRows,
  formatDuration,
} from './personalRecords';

describe('personalRecords helpers', () => {
  it('derives grouped personal records from workout history and persisted records', () => {
    const history = [
      {
        completed_at: '2026-02-01T10:00:00.000Z',
        exercises_completed: [
          {
            name: 'Bench Press',
            trackingType: 'reps' as const,
            sets: [
              { reps: 5, weight: 100, completed: true },
              { reps: 8, weight: 80, completed: true },
            ],
          },
        ],
      },
      {
        completed_at: '2026-01-15T10:00:00.000Z',
        exercises_completed: [
          {
            name: 'Bench Press',
            trackingType: 'reps' as const,
            sets: [{ reps: 12, weight: 60, completed: true }],
          },
          {
            name: 'Plank',
            trackingType: 'time' as const,
            sets: [{ reps: 90, weight: 0, completed: true }],
          },
        ],
      },
    ];

    const metadata = [
      { id: 'ex-bench', name: 'Bench Press', primary_muscle: 'Pecho', equipment: 'Barbell' },
      { id: 'ex-plank', name: 'Plank', primary_muscle: 'Core', equipment: 'Bodyweight' },
      { id: 'ex-pull', name: 'Pull Up', primary_muscle: 'Espalda', equipment: 'Bodyweight' },
    ];

    const persisted = {
      'Pull Up': {
        weight: 20,
        reps: 10,
        date: '2026-01-10T10:00:00.000Z',
      },
    };

    const rows = derivePersonalRecordRows(history, metadata, persisted);

    const bench = rows.find((row) => row.exerciseName === 'Bench Press');
    const plank = rows.find((row) => row.exerciseName === 'Plank');
    const pullUp = rows.find((row) => row.exerciseName === 'Pull Up');

    expect(rows).toHaveLength(3);

    expect(bench?.exerciseId).toBe('ex-bench');
    expect(bench?.bestE1RM).toBe(116.5);
    expect(bench?.bestReps).toBe(12);

    expect(plank?.bestTimeSeconds).toBe(90);
    expect(plank?.bestE1RM).toBeUndefined();

    expect(pullUp?.bestE1RM).toBe(26.5);
    expect(pullUp?.bestReps).toBe(10);
  });

  it('filters and sorts records by selected criteria', () => {
    const rows = [
      {
        exerciseKey: 'bench-press',
        exerciseName: 'Bench Press',
        bestE1RM: 116.5,
        bestReps: 12,
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
      {
        exerciseKey: 'pull-up',
        exerciseName: 'Pull Up',
        bestE1RM: 26.5,
        bestReps: 10,
        updatedAt: '2026-01-10T10:00:00.000Z',
      },
      {
        exerciseKey: 'plank',
        exerciseName: 'Plank',
        bestTimeSeconds: 120,
        updatedAt: '2026-01-05T10:00:00.000Z',
      },
    ];

    const repsSorted = filterAndSortPersonalRecordRows(rows, {
      searchQuery: '',
      prType: 'reps',
      sortBy: 'reps_desc',
    });

    expect(repsSorted).toHaveLength(2);
    expect(repsSorted[0].exerciseName).toBe('Bench Press');

    const timeOnly = filterAndSortPersonalRecordRows(rows, {
      searchQuery: 'plank',
      prType: 'time',
      sortBy: 'name_asc',
    });

    expect(timeOnly).toHaveLength(1);
    expect(timeOnly[0].exerciseName).toBe('Plank');

    expect(formatDuration(75)).toBe('01:15');
    expect(formatDuration(3661)).toBe('01:01:01');
  });
});
