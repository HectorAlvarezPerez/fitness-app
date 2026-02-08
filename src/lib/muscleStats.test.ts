import { describe, expect, it } from 'vitest';
import { accumulateMuscleSeriesDistribution } from './muscleStats';

describe('accumulateMuscleSeriesDistribution', () => {
  it('counts by number of series and not by number of exercises', () => {
    const distribution = accumulateMuscleSeriesDistribution([
      {
        primaryMuscle: 'Pecho',
        sets: [{}, {}, {}, {}],
      },
    ]);

    expect(distribution.pecho).toBe(4);
  });

  it('applies decimal factor for secondary muscles', () => {
    const distribution = accumulateMuscleSeriesDistribution([
      {
        primaryMuscle: 'Pecho',
        secondaryMuscles: ['Tríceps'],
        secondaryMuscleFactor: 0.25,
        sets: [{}, {}, {}, {}],
      },
    ]);

    expect(distribution.pecho).toBe(3);
    expect(distribution.triceps).toBe(1);
  });

  it('updates totals when series count changes', () => {
    const distribution = accumulateMuscleSeriesDistribution([
      {
        primaryMuscle: 'Espalda',
        secondaryMuscles: ['Bíceps'],
        secondaryMuscleFactor: 0.5,
        sets: [{}, {}, {}],
      },
      {
        primaryMuscle: 'Espalda',
        secondaryMuscles: ['Bíceps'],
        secondaryMuscleFactor: 0.5,
        sets: [{}, {}, {}, {}, {}],
      },
    ]);

    expect(distribution.espalda).toBe(4);
    expect(distribution.biceps).toBe(4);
  });
});

