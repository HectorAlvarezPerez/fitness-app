import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
        exercises_completed: [{ name: 'Press', sets: [{ completed: true }, { completed: false }] }],
        total_volume: 0,
        duration_minutes: 30,
      },
      {
        id: 'workout-cardio',
        user_id: 'user-1',
        routine_id: null,
        routine_name: 'Cardio calidad',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        exercises_completed: [
          {
            name: 'Correr en Cinta',
            activityType: 'cardio',
            trackingType: 'time',
            sets: [
              {
                completed: true,
                reps: 1800,
                cardioMetrics: {
                  durationSeconds: 1800,
                  distanceKm: 6,
                  averageHeartRateBpm: 150,
                  maxHeartRateBpm: 165,
                  cadenceRpm: 88,
                  calories: 420,
                  rpe: 7,
                },
              },
            ],
          },
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

  it('renders cardio metrics in the expanded workout details', () => {
    render(
      <MemoryRouter>
        <WorkoutHistory />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Cardio calidad'));

    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getAllByText('6.00 km').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5:00 /km')).toBeInTheDocument();
    expect(screen.getByText('FC 150 ppm')).toBeInTheDocument();
    expect(screen.getByText('FC máx 165 ppm')).toBeInTheDocument();
    expect(screen.getByText('88 rpm')).toBeInTheDocument();
    expect(screen.getByText('420 kcal')).toBeInTheDocument();
    expect(screen.getByText('RPE 7')).toBeInTheDocument();
  });
});
