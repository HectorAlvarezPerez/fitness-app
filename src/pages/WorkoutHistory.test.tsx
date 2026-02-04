import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutHistory from './WorkoutHistory';

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    workoutHistory: [
      {
        id: 'workout-1',
        user_id: 'user-1',
        routine_id: null,
        routine_name: 'Rutina Test',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        exercises_completed: [
          { name: 'Press', sets: [{ completed: true }, { completed: false }] },
        ],
        total_volume: 0,
        duration_minutes: 30,
      },
    ],
    loadWorkoutHistory: vi.fn(),
    savedRoutines: [],
    loadRoutines: vi.fn(),
    deleteWorkoutSession: vi.fn(),
    deleteWorkoutSessions: vi.fn(),
  }),
}));

describe('WorkoutHistory', () => {
  it('shows partial badge for incomplete workouts', () => {
    render(
      <MemoryRouter>
        <WorkoutHistory />
      </MemoryRouter>
    );

    expect(screen.getByText('PARCIAL')).toBeInTheDocument();
  });
});
