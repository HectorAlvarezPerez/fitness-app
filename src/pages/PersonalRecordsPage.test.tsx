import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalRecordsPage from './PersonalRecordsPage';

const loadWorkoutHistory = vi.fn().mockResolvedValue(undefined);
const loadExerciseLibrary = vi.fn().mockResolvedValue(undefined);
const loadPersonalRecords = vi.fn().mockResolvedValue(undefined);

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    workoutHistory: [
      {
        completed_at: '2026-02-01T10:00:00.000Z',
        exercises_completed: [
          {
            name: 'Bench Press',
            trackingType: 'reps',
            sets: [{ reps: 5, weight: 100, completed: true }],
          },
          {
            name: 'Plank',
            trackingType: 'time',
            sets: [{ reps: 120, weight: 0, completed: true }],
          },
          {
            name: 'Arnold Press',
            trackingType: 'reps',
            sets: [{ reps: 8, weight: 24, completed: true }],
          },
        ],
      },
    ],
    exerciseLibrary: [
      { id: '1', name: 'Bench Press', primary_muscle: 'Pecho', equipment: 'Barbell' },
      { id: '2', name: 'Plank', primary_muscle: 'Core', equipment: 'Bodyweight' },
      { id: '3', name: 'Arnold Press', primary_muscle: 'Hombros', equipment: 'Dumbbell' },
    ],
    personalRecords: {},
    loadWorkoutHistory,
    loadExerciseLibrary,
    loadPersonalRecords,
  }),
}));

describe('PersonalRecordsPage', () => {
  it('renders rows and supports filter/sort controls', async () => {
    render(
      <MemoryRouter>
        <PersonalRecordsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('Arnold Press')).toBeInTheDocument();

    const comboboxes = screen.getAllByRole('combobox');
    const filterSelect = comboboxes[0];
    const sortSelect = comboboxes[1];

    fireEvent.change(filterSelect, { target: { value: 'time' } });
    expect(screen.getByText('Plank')).toBeInTheDocument();
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument();

    fireEvent.change(filterSelect, { target: { value: 'all' } });
    fireEvent.change(sortSelect, { target: { value: 'name_asc' } });

    const rows = screen.getAllByTestId('pr-row');
    expect(rows[0].textContent).toContain('Arnold Press');
  });
});
