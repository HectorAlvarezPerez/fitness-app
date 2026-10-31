import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const store = { current: {} as any };
  const useStoreMock = Object.assign(
    vi.fn(() => store.current),
    {
      getState: () => store.current,
    }
  );
  return {
    store,
    useStoreMock,
    navigateMock: vi.fn(),
  };
});

vi.mock('../store/useStore', () => ({
  useStore: h.useStoreMock,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'routine-1' }),
  useNavigate: () => h.navigateMock,
}));

vi.mock('../components/ExerciseLibrarySheet', () => ({ default: () => null }));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: class {},
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[], from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  },
  SortableContext: ({ children }: any) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

import RoutineEditor from './RoutineEditor';

const makeExercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'run',
  name: 'Correr en Cinta',
  muscleGroup: 'Cardio',
  activityType: 'cardio',
  trackingType: 'time',
  restSeconds: 90,
  sets: [{ id: 'run-set', reps: 2700, weight: 0 }],
  ...overrides,
});

const createStoreState = (exercise: ReturnType<typeof makeExercise>) => {
  const exercises = [exercise];
  return {
    routineName: 'Routine One',
    setRoutineName: vi.fn(),
    exercises,
    addExercise: vi.fn(),
    updateExercise: vi.fn(),
    removeExercise: vi.fn(),
    setExercises: vi.fn(),
    savedRoutines: [{ id: 'routine-1', name: 'Routine One', exercises }],
    saveRoutine: vi.fn(),
    exerciseLibrary: [],
    loadExerciseLibrary: vi.fn().mockResolvedValue(undefined),
    selectedMuscleFilter: null,
    selectedEquipmentFilter: null,
    exerciseSearchQuery: '',
    setMuscleFilter: vi.fn(),
    setEquipmentFilter: vi.fn(),
    setExerciseSearchQuery: vi.fn(),
    getFilteredExercises: vi.fn(() => []),
    userData: undefined,
    activeWorkout: null,
  };
};

beforeEach(() => {
  h.navigateMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('RoutineEditor cardio durations', () => {
  it('shows and stores cardio set duration in minutes and seconds', () => {
    h.store.current = createStoreState(makeExercise());
    render(<RoutineEditor />);

    expect(screen.getByText('Duración (min)')).toBeInTheDocument();
    const durationInput = screen.getByLabelText('Duración de cardio');
    expect(durationInput).toHaveValue('45');

    fireEvent.change(durationInput, { target: { value: '30.5' } });

    expect(h.store.current.updateExercise).toHaveBeenCalledWith('run', {
      sets: [expect.objectContaining({ id: 'run-set', reps: 1830 })],
    });
  });

  it('keeps explicit strength time-based set duration in seconds', () => {
    const plank = makeExercise({
      id: 'plank',
      name: 'Plancha',
      muscleGroup: 'Core',
      activityType: 'strength',
      sets: [{ id: 'plank-set', reps: 45, weight: 0 }],
    });
    h.store.current = createStoreState(plank);
    render(<RoutineEditor />);

    expect(screen.getByText('Duración (seg)')).toBeInTheDocument();
    const durationInput = screen.getByLabelText('Duración en segundos');
    expect(durationInput).toHaveValue('45');

    fireEvent.change(durationInput, { target: { value: '60' } });

    expect(h.store.current.updateExercise).toHaveBeenCalledWith('plank', {
      sets: [expect.objectContaining({ id: 'plank-set', reps: 60 })],
    });
  });
});
