// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    serverRow: null as any,
    upsertError: null as { message: string } | null,
    deferUpserts: false,
    deferSessions: false,
    sessionUserId: 'u1' as string | null,
  };
  const pendingUpserts: Array<{
    resolve: (error?: { message: string } | null) => void;
  }> = [];
  const pendingSessions: Array<{ resolve: (userId: string | null) => void }> = [];
  const pendingBeacons: Array<{ resolve: () => void }> = [];
  const persistPayload = (payload: any, error: { message: string } | null) => {
    if (error) return { error };
    state.serverRow = {
      id: 'active-row',
      routine_id: payload.routine_id,
      routine_name: payload.routine_name,
      started_at: payload.started_at,
      updated_at: payload.updated_at,
      workout_data: payload.workout_data,
    };
    return { error: null };
  };
  const upsertMock = vi.fn((payload: any) => {
    if (state.deferUpserts) {
      return new Promise<{ error: { message: string } | null }>((resolve) => {
        pendingUpserts.push({
          resolve: (error = null) => resolve(persistPayload(payload, error)),
        });
      });
    }
    if (state.upsertError) return Promise.resolve({ error: state.upsertError });
    return Promise.resolve(persistPayload(payload, null));
  });
  const getSessionMock = vi.fn(() => {
    if (state.deferSessions) {
      return new Promise((resolve) => {
        pendingSessions.push({
          resolve: (userId) =>
            resolve({
              data: { session: userId ? { user: { id: userId } } : null },
              error: null,
            }),
        });
      });
    }
    return Promise.resolve({
      data: {
        session: state.sessionUserId ? { user: { id: state.sessionUserId } } : null,
      },
      error: null,
    });
  });
  const fetchMock = vi.fn((_url: string | URL | Request, options?: RequestInit) => {
    const body = JSON.parse(String(options?.body));
    return new Promise<Response>((resolve) => {
      pendingBeacons.push({
        resolve: () => {
          state.serverRow = {
            ...(state.serverRow ?? { id: 'active-row' }),
            workout_data: body.workout_data,
            updated_at: body.updated_at,
          };
          resolve({ ok: true } as Response);
        },
      });
    });
  });
  const fromMock = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: state.serverRow, error: null }),
      }),
    }),
    upsert: upsertMock,
  }));
  return {
    state,
    pendingUpserts,
    pendingSessions,
    pendingBeacons,
    upsertMock,
    getSessionMock,
    fetchMock,
    fromMock,
    cancelRestPushMock: vi.fn(),
  };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: h.getSessionMock,
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: h.fromMock,
  },
  getCachedAuth: () => ({ accessToken: 'token', userId: 'u1' }),
  SUPABASE_REST_URL: 'http://localhost',
  SUPABASE_ANON_KEY: 'anon',
}));

vi.mock('../lib/push', () => ({
  scheduleRestPush: vi.fn(),
  cancelRestPush: h.cancelRestPushMock,
}));

import type { ActiveWorkout, ActiveWorkoutExercise, ActiveWorkoutRestTimer } from './useStore';
import { useStore } from './useStore';

const exercise = (
  exerciseId: string,
  options: Partial<ActiveWorkoutExercise> = {}
): ActiveWorkoutExercise => ({
  exerciseId,
  name: `Exercise ${exerciseId}`,
  primaryMuscle: 'Test',
  restSeconds: 90,
  sets: [{ id: `${exerciseId}-set-1`, reps: 8, weight: 20, completed: false }],
  ...options,
});

const workout = (
  exercises: ActiveWorkoutExercise[],
  overrides: Partial<ActiveWorkout> = {}
): ActiveWorkout => ({
  id: 'active-row',
  routineId: 'routine-1',
  routineName: 'Workout flow',
  startedAt: '2026-07-24T08:00:00.000Z',
  currentExerciseId: exercises[0]?.exerciseId,
  currentSetIndex: 0,
  restTimer: null,
  exercises,
  updatedAt: '2026-07-24T08:01:00.000Z',
  ...overrides,
});

const timer = (exerciseId: string, setIndex = 0): ActiveWorkoutRestTimer => ({
  exerciseId,
  setIndex,
  durationSeconds: 90,
  startedAt: '2026-07-24T08:02:00.000Z',
  instanceId: `rest-${exerciseId}`,
});

const setActive = (
  exercises: ActiveWorkoutExercise[],
  overrides: Partial<ActiveWorkout> = {},
  persistedUserId = 'u1'
) =>
  useStore.setState({
    activeWorkout: workout(exercises, overrides),
    persistedUserId,
  });

const exerciseIds = () =>
  useStore.getState().activeWorkout?.exercises.map((item) => item.exerciseId);

const resumePersistedWorkout = async () => {
  useStore.setState({ activeWorkout: null });
  await useStore.getState().loadActiveWorkout();
};

beforeEach(() => {
  localStorage.clear();
  h.state.serverRow = null;
  h.state.upsertError = null;
  h.state.deferUpserts = false;
  h.state.deferSessions = false;
  h.state.sessionUserId = 'u1';
  h.pendingUpserts.length = 0;
  h.pendingSessions.length = 0;
  h.pendingBeacons.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal('fetch', h.fetchMock);
  useStore.setState({ activeWorkout: null, persistedUserId: null, notification: null });
});

describe('active-workout persistence safety net', () => {
  it('round-trips the existing ordered exercise payload through flush and resume', async () => {
    setActive([exercise('a'), exercise('b'), exercise('c')]);

    await useStore.getState().flushActiveWorkoutNow();
    await resumePersistedWorkout();

    expect(h.upsertMock).toHaveBeenCalledTimes(1);
    expect(exerciseIds()).toEqual(['a', 'b', 'c']);
  });
});

describe('persisted live exercise edits', () => {
  it('keeps a deleted exercise absent and preserves remaining order after resume', async () => {
    setActive([exercise('a'), exercise('b'), exercise('c')]);

    expect(await useStore.getState().removeActiveWorkoutExercise('b')).toBe(true);
    await resumePersistedWorkout();

    expect(exerciseIds()).toEqual(['a', 'c']);
  });

  it('restores the ID-based exercise order produced by a reorder', async () => {
    setActive([exercise('a'), exercise('b'), exercise('c')]);

    expect(await useStore.getState().reorderActiveWorkoutExercises('c', 'a')).toBe(true);
    await resumePersistedWorkout();

    expect(exerciseIds()).toEqual(['c', 'a', 'b']);
  });

  it.each([
    {
      edit: 'delete',
      expectedIds: ['b', 'c'],
      mutate: () => useStore.getState().removeActiveWorkoutExercise('a'),
    },
    {
      edit: 'reorder',
      expectedIds: ['a', 'c', 'b'],
      mutate: () => useStore.getState().reorderActiveWorkoutExercises('b', 'c'),
    },
  ])('reports a failed $edit flush and retains a recoverable local snapshot', async (scenario) => {
    const originalUpdatedAt = '2026-07-24T08:01:00.000Z';
    setActive([exercise('a'), exercise('b'), exercise('c')], {
      updatedAt: originalUpdatedAt,
    });
    h.state.upsertError = { message: 'offline' };

    expect(await scenario.mutate()).toBe(false);
    expect(useStore.getState().notification).toMatchObject({
      title: 'No se pudo guardar',
      type: 'error',
    });
    expect(exerciseIds()).toEqual(scenario.expectedIds);
    expect(useStore.getState().activeWorkout?.updatedAt).not.toBe(originalUpdatedAt);

    h.state.upsertError = null;
    expect(await useStore.getState().flushActiveWorkoutNow()).toBe(true);
    await resumePersistedWorkout();
    expect(exerciseIds()).toEqual(scenario.expectedIds);
  });
});

describe('dependent active-workout state repair', () => {
  it('repairs focus, timer push, and a two-member superset after deleting its owner', async () => {
    setActive(
      [
        exercise('a'),
        exercise('b', { supersetId: 'superset-1' }),
        exercise('c', { supersetId: 'superset-1' }),
      ],
      { currentExerciseId: 'b', currentSetIndex: 4, restTimer: timer('b', 4) }
    );

    expect(await useStore.getState().removeActiveWorkoutExercise('b')).toBe(true);

    const state = useStore.getState().activeWorkout;
    expect([state?.currentExerciseId, state?.currentSetIndex]).toEqual(['c', 0]);
    expect(state?.restTimer).toBeNull();
    expect(state?.exercises.find((item) => item.exerciseId === 'c')?.supersetId).toBeUndefined();
    expect(h.cancelRestPushMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the previous exercise and clears focus when it has no valid set', async () => {
    const unrelatedTimer = timer('a');
    setActive([exercise('a', { sets: [] }), exercise('b')], {
      currentExerciseId: 'b',
      currentSetIndex: 2,
      restTimer: unrelatedTimer,
    });

    expect(await useStore.getState().removeActiveWorkoutExercise('b')).toBe(true);

    const state = useStore.getState().activeWorkout;
    expect([state?.currentExerciseId, state?.currentSetIndex]).toEqual([undefined, undefined]);
    expect(state?.restTimer).toBe(unrelatedTimer);
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });

  it('preserves a superset that still has two members after deletion', async () => {
    setActive(['a', 'b', 'c'].map((id) => exercise(id, { supersetId: 'superset-1' })));

    expect(await useStore.getState().removeActiveWorkoutExercise('a')).toBe(true);

    expect(
      useStore.getState().activeWorkout?.exercises.map((item) => [item.exerciseId, item.supersetId])
    ).toEqual([
      ['b', 'superset-1'],
      ['c', 'superset-1'],
    ]);
  });

  it('preserves ID references and exercise objects on unrelated reorder', async () => {
    const first = exercise('a', { supersetId: 'superset-1' });
    const focused = exercise('b', { supersetId: 'superset-1' });
    const moved = exercise('c');
    const activeTimer = timer('b');
    setActive([first, focused, moved], {
      currentExerciseId: 'b',
      currentSetIndex: 0,
      restTimer: activeTimer,
    });

    expect(await useStore.getState().reorderActiveWorkoutExercises('c', 'a')).toBe(true);

    const state = useStore.getState().activeWorkout;
    const reordered = [moved, first, focused];
    expect(state?.exercises).toEqual(reordered);
    expect(state?.exercises.every((item, index) => item === reordered[index])).toBe(true);
    expect([state?.currentExerciseId, state?.currentSetIndex]).toEqual(['b', 0]);
    expect(state?.restTimer).toBe(activeTimer);
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });
});

describe('monotonic owner-bound persistence', () => {
  it('keeps the newest overlapping edit as the final persisted snapshot', async () => {
    h.state.deferUpserts = true;
    setActive([exercise('a'), exercise('b'), exercise('c')]);

    const firstEdit = useStore.getState().removeActiveWorkoutExercise('a');
    await vi.waitFor(() => expect(h.pendingUpserts).toHaveLength(1));
    const secondEdit = useStore.getState().reorderActiveWorkoutExercises('c', 'b');
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (h.pendingUpserts.length === 2) {
      h.pendingUpserts[1].resolve();
      expect(await secondEdit).toBe(true);
      h.pendingUpserts[0].resolve();
      expect(await firstEdit).toBe(true);
    } else {
      h.pendingUpserts[0].resolve();
      expect(await firstEdit).toBe(true);
      await vi.waitFor(() => expect(h.pendingUpserts).toHaveLength(2));
      h.pendingUpserts[1].resolve();
      expect(await secondEdit).toBe(true);
    }

    expect(h.state.serverRow.workout_data.exercises.map((item: any) => item.exerciseId)).toEqual([
      'c',
      'b',
    ]);
  });

  it('does not persist an old workout into a newly authenticated user after reset', async () => {
    h.state.deferSessions = true;
    setActive([exercise('a'), exercise('b')]);

    const staleEdit = useStore.getState().removeActiveWorkoutExercise('a');
    await vi.waitFor(() => expect(h.pendingSessions).toHaveLength(1));
    useStore.getState().resetUserScopedState();
    setActive([exercise('x'), exercise('y')], {}, 'u2');
    h.pendingSessions[0].resolve('u2');

    expect(await staleEdit).toBe(false);
    expect(h.upsertMock).not.toHaveBeenCalled();
    expect(exerciseIds()).toEqual(['x', 'y']);
    expect(useStore.getState().notification).toBeNull();
  });

  it('rejects a stale old-user auth result when state changed owners during the await', async () => {
    h.state.deferSessions = true;
    setActive([exercise('a'), exercise('b')]);

    const staleEdit = useStore.getState().removeActiveWorkoutExercise('a');
    await vi.waitFor(() => expect(h.pendingSessions).toHaveLength(1));
    useStore.getState().resetUserScopedState();
    setActive([exercise('x'), exercise('y')], {}, 'u2');
    h.pendingSessions[0].resolve('u1');

    expect(await staleEdit).toBe(false);
    expect(h.upsertMock).not.toHaveBeenCalled();
    expect(exerciseIds()).toEqual(['x', 'y']);
    expect(useStore.getState().notification).toBeNull();
  });

  it('waits for a pending same-owner write before starting and resolving a newer edit', async () => {
    vi.useFakeTimers();
    try {
      h.state.deferUpserts = true;
      setActive([exercise('a'), exercise('b'), exercise('c')]);

      const firstEdit = useStore.getState().removeActiveWorkoutExercise('a');
      await vi.waitFor(() => expect(h.pendingUpserts).toHaveLength(1));

      const secondEdit = useStore.getState().reorderActiveWorkoutExercises('c', 'b');
      let firstResultBeforeSettle: boolean | 'pending' = 'pending';
      void firstEdit.then((result) => {
        firstResultBeforeSettle = result;
      });

      await vi.advanceTimersByTimeAsync(10_001);
      await Promise.resolve();
      const pendingCountBeforeFirstSettles = h.pendingUpserts.length;
      const observedFirstResultBeforeSettle = firstResultBeforeSettle;

      h.pendingUpserts[0].resolve();
      await vi.waitFor(() => expect(h.pendingUpserts).toHaveLength(2));
      const firstResult = await firstEdit;
      h.pendingUpserts[1].resolve();
      const secondResult = await secondEdit;

      expect(pendingCountBeforeFirstSettles).toBe(1);
      expect(observedFirstResultBeforeSettle).toBe('pending');
      expect(firstResult).toBe(true);
      expect(secondResult).toBe(true);
      expect(h.state.serverRow.workout_data.exercises.map((item: any) => item.exerciseId)).toEqual([
        'c',
        'b',
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prevents a delayed lifecycle PATCH from restoring a pre-edit payload', async () => {
    setActive([exercise('a'), exercise('b'), exercise('c')]);
    useStore.getState().beaconFlushActiveWorkout();
    await vi.waitFor(() => expect(h.pendingBeacons).toHaveLength(1));

    const edit = useStore.getState().removeActiveWorkoutExercise('a');
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (h.upsertMock.mock.calls.length > 0) {
      expect(await edit).toBe(true);
      h.pendingBeacons[0].resolve();
    } else {
      h.pendingBeacons[0].resolve();
      expect(await edit).toBe(true);
    }

    expect(h.state.serverRow.workout_data.exercises.map((item: any) => item.exerciseId)).toEqual([
      'b',
      'c',
    ]);
  });

  it('lets a new owner persist while the old owner write never settles', async () => {
    h.state.deferUpserts = true;
    setActive([exercise('a'), exercise('b')]);
    const oldOwnerEdit = useStore.getState().removeActiveWorkoutExercise('a');
    await vi.waitFor(() => expect(h.pendingUpserts).toHaveLength(1));

    useStore.getState().resetUserScopedState();
    h.state.sessionUserId = 'u2';
    setActive([exercise('x'), exercise('y')], {}, 'u2');
    const newOwnerEdit = useStore.getState().removeActiveWorkoutExercise('x');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(h.pendingUpserts).toHaveLength(2);
    h.pendingUpserts[1].resolve();
    expect(await newOwnerEdit).toBe(true);
    h.pendingUpserts[0].resolve();
    expect(await oldOwnerEdit).toBe(false);
    expect(useStore.getState().notification).toBeNull();
  });
});
