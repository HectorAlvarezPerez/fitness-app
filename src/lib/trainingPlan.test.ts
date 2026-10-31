import { describe, expect, it } from 'vitest';
import {
  buildTrainingPlanRoutines,
  TRAINING_PLAN_FOLDER_NAME,
  TRAINING_PLAN_ROUTINES,
} from './trainingPlan';

describe('trainingPlan', () => {
  it('defines the six Monday-to-Saturday sessions in the requested folder', () => {
    expect(TRAINING_PLAN_FOLDER_NAME).toContain('4 fuerza + 2 cardio');
    expect(TRAINING_PLAN_ROUTINES).toHaveLength(6);
    expect(TRAINING_PLAN_ROUTINES.map((routine) => routine.name)).toEqual([
      'Lunes · Upper A + Core',
      'Martes · Lower',
      'Miércoles · Cardio calidad',
      'Jueves · Upper B',
      'Viernes · Full Body + Core',
      'Sábado · Cardio Zona 2',
    ]);
  });

  it('adds one working warmup per strength session and two extra Upper warmups', () => {
    const routines = buildTrainingPlanRoutines('user-1', 'folder-1');
    const warmups = routines.map((routine) =>
      routine.exercises.reduce(
        (count, exercise) => count + exercise.sets.filter((set) => set.isWarmup).length,
        0
      )
    );

    expect(warmups).toEqual([2, 1, 0, 3, 1, 0]);
    expect(
      routines[0].exercises.find((exercise) => exercise.name === 'Cable Crunch')?.sets
    ).toHaveLength(3);
    expect(
      routines[4].exercises.find((exercise) => exercise.name === 'Elevaciones de Piernas')?.sets
    ).toHaveLength(3);
    expect(routines[1].exercises.find((exercise) => exercise.name === 'Plancha')?.notes).toContain(
      'duración 0:30-1:00'
    );
  });

  it('builds user-scoped snapshots without mutating the manifest', () => {
    const routines = buildTrainingPlanRoutines('user-1', 'folder-1', '2026-08-26T10:00:00.000Z');
    expect(routines.every((routine) => routine.user_id === 'user-1')).toBe(true);
    expect(routines.every((routine) => routine.folder_id === 'folder-1')).toBe(true);
    expect(routines[0].created_at).toBe('2026-08-26T10:00:00.000Z');
    routines[0].exercises[0].sets[0].reps = 1;
    expect(TRAINING_PLAN_ROUTINES[0].exercises[0].sets[0].reps).not.toBe(1);
  });
});
