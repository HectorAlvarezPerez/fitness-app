import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    route: {
      id: 'routine-1' as string | undefined,
      pathname: '/routine/routine-1/workout',
      search: '',
    },
    navigateMock: vi.fn(),
  };
});

vi.mock('../store/useStore', () => ({
  useStore: h.useStoreMock,
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: h.route.id }),
  useNavigate: () => h.navigateMock,
  useSearchParams: () => [new URLSearchParams(h.route.search)],
  useLocation: () => ({ pathname: h.route.pathname }),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../components/WorkoutTimer', () => ({
  default: () => <div data-testid="workout-timer" />,
}));

vi.mock('../components/RestTimer', () => ({
  default: () => <div data-testid="rest-timer" />,
}));

vi.mock('../components/ExerciseLibrarySheet', () => ({
  default: () => null,
}));

vi.mock('../components/ConfirmDialog', () => ({
  default: ({
    isOpen,
    title,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
  }: any) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onCancel}>{cancelLabel}</button>
        <button onClick={onConfirm}>{confirmLabel}</button>
      </div>
    ) : null,
}));

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

import WorkoutSession, { getWorkoutContentReservation } from './WorkoutSession';

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const routine = {
  id: 'routine-1',
  user_id: 'u1',
  name: 'Routine One',
  exercises: [],
  created_at: '2026-07-01T08:00:00.000Z',
  updated_at: '2026-07-01T08:00:00.000Z',
};

const exercise = (exerciseId: string) => ({
  exerciseId,
  name: `Exercise ${exerciseId}`,
  primaryMuscle: 'Test',
  restSeconds: 90,
  sets: [
    {
      id: `${exerciseId}-set-1`,
      reps: 8,
      weight: 20,
      completed: true,
    },
  ],
});

const activeWorkout = (overrides: Record<string, unknown> = {}, exerciseIds = ['a', 'b', 'c']) => ({
  id: 'active-row',
  routineId: 'routine-1',
  routineName: 'Routine One',
  startedAt: '2026-07-24T08:00:00.000Z',
  currentExerciseId: 'a',
  currentSetIndex: 0,
  restTimer: null,
  exercises: exerciseIds.map(exercise),
  ...overrides,
});

const createStoreState = () => ({
  savedRoutines: [routine],
  loadRoutines: vi.fn().mockResolvedValue({ ok: true }),
  workoutHistory: [],
  loadWorkoutHistory: vi.fn().mockResolvedValue(undefined),
  activeWorkout: activeWorkout(),
  persistedUserId: 'u1',
  loadActiveWorkout: vi.fn().mockResolvedValue({ ok: true }),
  startWorkout: vi.fn().mockResolvedValue(true),
  startEmptyWorkout: vi.fn().mockResolvedValue(true),
  addActiveWorkoutExercise: vi.fn(),
  updateActiveWorkoutExerciseNotes: vi.fn(),
  updateActiveWorkoutExerciseRest: vi.fn(),
  setActiveExerciseSuperset: vi.fn(),
  removeActiveWorkoutExercise: vi.fn().mockResolvedValue(true),
  reorderActiveWorkoutExercises: vi.fn().mockResolvedValue(true),
  updateWorkoutExerciseSets: vi.fn(),
  setActiveWorkoutPosition: vi.fn(),
  startRestTimer: vi.fn(),
  clearRestTimer: vi.fn(),
  pauseRestTimer: vi.fn(),
  resumeRestTimer: vi.fn(),
  extendRestTimer: vi.fn(),
  finishWorkout: vi.fn().mockResolvedValue({ ok: true }),
  updateRoutineFromWorkout: vi.fn().mockResolvedValue(true),
  cancelWorkout: vi.fn().mockResolvedValue(undefined),
});

const clickFinishConfirmation = async () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Finalizar' })[0]);
  const dialog = screen.getByRole('dialog', { name: 'Finalizar entrenamiento' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }));
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  h.route.id = 'routine-1';
  h.route.pathname = '/routine/routine-1/workout';
  h.route.search = '';
  h.navigateMock.mockReset();
  h.useStoreMock.mockClear();
  h.store.current = createStoreState();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WorkoutSession initialization ownership', () => {
  it('waits for both startup loads before consuming initialization and starting once', async () => {
    const routinesLoad = deferred<{ ok: true }>();
    const activeLoad = deferred<{ ok: true }>();
    h.store.current.savedRoutines = [];
    h.store.current.activeWorkout = null;
    h.store.current.loadRoutines = vi.fn(async () => {
      const result = await routinesLoad.promise;
      h.store.current.savedRoutines = [routine];
      return result;
    });
    h.store.current.loadActiveWorkout = vi.fn(() => activeLoad.promise);

    render(<WorkoutSession />);

    activeLoad.resolve({ ok: true });
    await act(async () => {
      await activeLoad.promise;
    });
    expect(h.store.current.startWorkout).not.toHaveBeenCalled();

    routinesLoad.resolve({ ok: true });
    await waitFor(() => expect(h.store.current.startWorkout).toHaveBeenCalledTimes(1));
    expect(h.store.current.startWorkout).toHaveBeenCalledWith(routine, undefined);
  });

  it.each(['routines', 'active workout'] as const)(
    'shows the initialization error and never starts when the %s loader fulfills with failure',
    async (failedLoader) => {
      h.store.current.activeWorkout = null;
      if (failedLoader === 'routines') {
        h.store.current.loadRoutines.mockResolvedValue({
          ok: false,
          reason: 'request-failed',
        });
      } else {
        h.store.current.loadActiveWorkout.mockResolvedValue({
          ok: false,
          reason: 'request-failed',
        });
      }

      render(<WorkoutSession />);

      expect(await screen.findByText('No se pudo cargar el entrenamiento.')).toBeInTheDocument();
      expect(h.store.current.startWorkout).not.toHaveBeenCalled();
      expect(h.store.current.startEmptyWorkout).not.toHaveBeenCalled();
    }
  );

  it('accepts a restored workout without starting another one', async () => {
    render(<WorkoutSession />);

    await waitFor(() => expect(h.store.current.loadActiveWorkout).toHaveBeenCalledTimes(1));
    expect(h.store.current.startWorkout).not.toHaveBeenCalled();
    expect(screen.getByText('Routine One')).toBeInTheDocument();
  });

  it('does not restart after a successful terminal finish on the same mount', async () => {
    const view = render(<WorkoutSession />);
    await waitFor(() => expect(h.store.current.loadActiveWorkout).toHaveBeenCalledTimes(1));
    const candidate = { routineId: 'routine-1', exercises: [] };
    h.store.current.finishWorkout.mockImplementation(async () => {
      h.store.current.activeWorkout = null;
      return { ok: true, routineUpdate: candidate };
    });

    await clickFinishConfirmation();
    view.rerender(<WorkoutSession />);

    expect(h.store.current.startWorkout).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Actualizar rutina original' })).toBeInTheDocument();
    expect(h.navigateMock).not.toHaveBeenCalled();
  });
});

describe('post-finish originating-template choice', () => {
  it('updates the originating template only after Yes and then navigates', async () => {
    const candidate = { routineId: 'routine-1', exercises: [] };
    h.store.current.finishWorkout.mockImplementation(async () => {
      h.store.current.activeWorkout = null;
      return { ok: true, routineUpdate: candidate };
    });
    render(<WorkoutSession />);

    await clickFinishConfirmation();
    expect(h.store.current.updateRoutineFromWorkout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, actualizar' }));

    await waitFor(() =>
      expect(h.store.current.updateRoutineFromWorkout).toHaveBeenCalledWith(candidate)
    );
    expect(h.navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it.each([
    ['false', () => Promise.resolve(false)],
    ['rejection', () => Promise.reject(new Error('template update failed'))],
  ])(
    'keeps the candidate available for retry when the template update returns %s',
    async (_failureMode, failUpdate) => {
      const candidate = { routineId: 'routine-1', exercises: [] };
      h.store.current.finishWorkout.mockImplementation(async () => {
        h.store.current.activeWorkout = null;
        return { ok: true, routineUpdate: candidate };
      });
      h.store.current.updateRoutineFromWorkout
        .mockImplementationOnce(failUpdate)
        .mockResolvedValueOnce(true);
      render(<WorkoutSession />);

      await clickFinishConfirmation();
      fireEvent.click(screen.getByRole('button', { name: 'Sí, actualizar' }));

      await waitFor(() =>
        expect(h.store.current.updateRoutineFromWorkout).toHaveBeenCalledWith(candidate)
      );
      expect(
        screen.getByRole('dialog', { name: 'Actualizar rutina original' })
      ).toBeInTheDocument();
      expect(h.navigateMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Sí, actualizar' }));

      await waitFor(() =>
        expect(h.store.current.updateRoutineFromWorkout).toHaveBeenCalledTimes(2)
      );
      expect(h.store.current.updateRoutineFromWorkout).toHaveBeenLastCalledWith(candidate);
      expect(h.navigateMock).toHaveBeenCalledWith('/dashboard');
    }
  );

  it.each([
    ['No', 'No, mantener'],
    ['dismissal', 'Cerrar actualización de rutina'],
  ])('does not mutate the template after %s', async (_label, actionName) => {
    h.store.current.finishWorkout.mockImplementation(async () => {
      h.store.current.activeWorkout = null;
      return {
        ok: true,
        routineUpdate: { routineId: 'routine-1', exercises: [] },
      };
    });
    render(<WorkoutSession />);

    await clickFinishConfirmation();
    fireEvent.click(screen.getByRole('button', { name: actionName }));

    expect(h.store.current.updateRoutineFromWorkout).not.toHaveBeenCalled();
    expect(h.navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it.each([
    ['free', { ok: true }, undefined, true],
    ['missing template', { ok: true }, 'routine-1', true],
    ['failed', { ok: false }, 'routine-1', false],
  ])(
    'does not show template choice for a %s finish',
    async (_label, finishResult, routineId, shouldNavigate) => {
      h.store.current.activeWorkout = activeWorkout({ routineId });
      h.store.current.finishWorkout.mockResolvedValue(finishResult);
      render(<WorkoutSession />);

      await clickFinishConfirmation();

      expect(
        screen.queryByRole('dialog', { name: 'Actualizar rutina original' })
      ).not.toBeInTheDocument();
      expect(h.store.current.updateRoutineFromWorkout).not.toHaveBeenCalled();
      if (shouldNavigate) {
        expect(h.navigateMock).toHaveBeenCalledWith('/dashboard');
      } else {
        expect(h.navigateMock).not.toHaveBeenCalled();
      }
    }
  );

  it('does not show template choice for cancellation', async () => {
    vi.useFakeTimers();
    render(<WorkoutSession />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar entrenamiento' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Cancelar entrenamiento' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar entrenamiento' }));
    await vi.advanceTimersByTimeAsync(100);

    expect(h.store.current.cancelWorkout).toHaveBeenCalledTimes(1);
    expect(h.store.current.updateRoutineFromWorkout).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Actualizar rutina original' })
    ).not.toBeInTheDocument();
  });
});

describe('accessible live exercise controls', () => {
  it('offers labeled focusable buttons for delete and ID-based move up/down', () => {
    render(<WorkoutSession />);

    const moveLastUp = screen.getByRole('button', {
      name: 'Mover Exercise c arriba',
    });
    const moveFirstDown = screen.getByRole('button', {
      name: 'Mover Exercise a abajo',
    });
    const deleteLast = screen.getByRole('button', {
      name: 'Eliminar Exercise c',
    });

    moveLastUp.focus();
    expect(moveLastUp).toHaveFocus();
    fireEvent.click(moveLastUp);
    fireEvent.click(moveFirstDown);
    fireEvent.click(deleteLast);

    expect(h.store.current.reorderActiveWorkoutExercises).toHaveBeenNthCalledWith(1, 'c', 'b');
    expect(h.store.current.reorderActiveWorkoutExercises).toHaveBeenNthCalledWith(2, 'a', 'b');
    expect(h.store.current.removeActiveWorkoutExercise).toHaveBeenCalledWith('c');
  });

  it('keeps the final exercise controls focusable within exact timer-aware mobile clearance', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    });
    h.store.current.activeWorkout = activeWorkout({
      restTimer: {
        exerciseId: 'a',
        setIndex: 0,
        durationSeconds: 90,
        startedAt: '2026-07-24T08:02:00.000Z',
        instanceId: 'rest-a',
      },
    });
    render(<WorkoutSession />);

    const content = screen.getByTestId('workout-scroll-content');
    expect(content.className).toContain(
      'pb-[calc(19rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]'
    );
    expect(content.className).toContain(
      'lg:pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]'
    );

    const deleteLast = screen.getByRole('button', {
      name: 'Eliminar Exercise c',
    });
    deleteLast.focus();
    expect(deleteLast).toHaveFocus();
  });
});

describe('getWorkoutContentReservation', () => {
  it('keeps the compact mobile reservation and both inset contributions without a timer', () => {
    expect(getWorkoutContentReservation(false)).toEqual({
      mobileBaseRem: 9,
      desktopBaseRem: 9,
      includesSafeAreaInset: true,
      includesKeyboardInset: true,
    });
  });

  it('expands only the mobile reservation when the timer is visible', () => {
    expect(getWorkoutContentReservation(true)).toEqual({
      mobileBaseRem: 19,
      desktopBaseRem: 9,
      includesSafeAreaInset: true,
      includesKeyboardInset: true,
    });
  });
});
