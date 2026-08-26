// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    serverRow: null as any,
    upsertError: null as { message: string } | null,
    historyInsertError: null as { message: string } | null,
    activeDeleteError: null as { message: string } | null,
    historyDeleteError: null as { message: string } | null,
    historyLookupError: null as { message: string } | null,
    routineUpdateError: null as { message: string } | null,
    historyRows: [] as any[],
    routineRows: [] as any[],
    deferUpserts: false,
    deferSessions: false,
    deferHistoryInserts: false,
    deferActiveDeletes: false,
    historyInsertCommitsWithError: false,
    sessionUserId: 'u1' as string | null,
  };
  const pendingUpserts: Array<{
    resolve: (error?: { message: string } | null) => void;
  }> = [];
  const pendingSessions: Array<{ resolve: (userId: string | null) => void }> = [];
  const pendingBeacons: Array<{ resolve: () => void }> = [];
  const pendingHistoryInserts: Array<{ resolve: () => void }> = [];
  const pendingActiveDeletes: Array<{ resolve: () => void }> = [];
  const persistPayload = (payload: any, error: { message: string } | null) => {
    if (error) return { data: null, error };
    state.serverRow = {
      id: 'active-row',
      user_id: payload.user_id,
      routine_id: payload.routine_id,
      routine_name: payload.routine_name,
      started_at: payload.started_at,
      updated_at: payload.updated_at,
      workout_data: payload.workout_data,
    };
    return { data: { id: 'active-row' }, error: null };
  };
  const upsertResult = (promise: Promise<any>) => {
    (promise as any).select = () => ({ single: () => promise });
    return promise;
  };
  const upsertMock = vi.fn((payload: any) => {
    if (state.deferUpserts) {
      return upsertResult(
        new Promise<{ data: { id: string } | null; error: { message: string } | null }>(
          (resolve) => {
            pendingUpserts.push({
              resolve: (error = null) => resolve(persistPayload(payload, error)),
            });
          }
        )
      );
    }
    if (state.upsertError)
      return upsertResult(Promise.resolve({ data: null, error: state.upsertError }));
    return upsertResult(Promise.resolve(persistPayload(payload, null)));
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
  const getUserMock = vi.fn(() =>
    Promise.resolve({
      data: {
        user: state.sessionUserId ? { id: state.sessionUserId } : null,
      },
      error: null,
    })
  );
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
  const historyInsertMock = vi.fn((payload: any) => {
    const execute = () => {
      if (state.historyRows.some((row) => row.id === payload.id)) {
        return { data: null, error: { message: 'duplicate history id' } };
      }
      if (state.historyInsertError) {
        return { data: null, error: state.historyInsertError };
      }
      const row = {
        id: payload.id ?? `history-${state.historyRows.length + 1}`,
        ...payload,
      };
      state.historyRows.push(row);
      if (state.historyInsertCommitsWithError) {
        return { data: null, error: { message: 'response lost after commit' } };
      }
      return { data: { id: row.id }, error: null };
    };
    return {
      select: () => ({
        single: () => {
          if (!state.deferHistoryInserts) return Promise.resolve(execute());
          return new Promise<ReturnType<typeof execute>>((resolve) => {
            pendingHistoryInserts.push({ resolve: () => resolve(execute()) });
          });
        },
      }),
    };
  });
  const historySelectMock = vi.fn(() => {
    const filters: Record<string, unknown> = {};
    const builder: any = {
      eq: vi.fn((field: string, value: unknown) => {
        filters[field] = value;
        return builder;
      }),
      order: vi.fn(() => Promise.resolve({ data: state.historyRows, error: null })),
      maybeSingle: vi.fn(async () => {
        if (state.historyLookupError) {
          return { data: null, error: state.historyLookupError };
        }
        const row = state.historyRows.find(
          (candidate) =>
            (filters.id === undefined || candidate.id === filters.id) &&
            (filters.user_id === undefined || candidate.user_id === filters.user_id)
        );
        return { data: row ? { id: row.id } : null, error: null };
      }),
    };
    return builder;
  });
  const activeDeleteMock = vi.fn(() => {
    const filters: Record<string, unknown> = {};
    let execution: Promise<{
      data: { id: string } | null;
      error: { message: string } | null;
    }> | null = null;
    const execute = () => {
      if (state.activeDeleteError) {
        return { data: null, error: state.activeDeleteError };
      }
      const row = state.serverRow;
      const matches =
        !!row &&
        (filters.id === undefined || row.id === filters.id) &&
        (filters.user_id === undefined || row.user_id === filters.user_id) &&
        (filters.started_at === undefined || row.started_at === filters.started_at);
      if (!matches) return { data: null, error: null };
      state.serverRow = null;
      return { data: { id: row.id }, error: null };
    };
    const run = () => {
      if (execution) return execution;
      if (!state.deferActiveDeletes) {
        execution = Promise.resolve(execute());
      } else {
        execution = new Promise<ReturnType<typeof execute>>((resolve) => {
          pendingActiveDeletes.push({ resolve: () => resolve(execute()) });
        });
      }
      return execution;
    };
    const builder: any = {
      eq: vi.fn((field: string, value: unknown) => {
        filters[field] = value;
        return builder;
      }),
      select: vi.fn(() => ({
        maybeSingle: () => run(),
      })),
      then: (
        resolve: (result: ReturnType<typeof execute>) => unknown,
        reject: (error: unknown) => unknown
      ) => run().then(resolve, reject),
    };
    return builder;
  });
  const historyDeleteMock = vi.fn(() => {
    const filters: Record<string, unknown> = {};
    let execution: Promise<{ error: { message: string } | null }> | null = null;
    const execute = () => {
      if (state.historyDeleteError) return { error: state.historyDeleteError };
      state.historyRows = state.historyRows.filter(
        (row) =>
          (filters.id !== undefined && row.id !== filters.id) ||
          (filters.user_id !== undefined && row.user_id !== filters.user_id)
      );
      return { error: null };
    };
    const builder: any = {
      eq: vi.fn((field: string, value: unknown) => {
        filters[field] = value;
        return builder;
      }),
      then: (resolve: (result: ReturnType<typeof execute>) => unknown, reject: () => unknown) => {
        execution ??= Promise.resolve(execute());
        return execution.then(resolve, reject);
      },
    };
    return builder;
  });
  const routineUpdateMock = vi.fn((updates: any) => {
    const filters: Record<string, unknown> = {};
    const builder = {
      eq: vi.fn((field: string, value: unknown) => {
        filters[field] = value;
        return builder;
      }),
      select: vi.fn(() => ({
        maybeSingle: async () => {
          if (state.routineUpdateError) {
            return { data: null, error: state.routineUpdateError };
          }
          const routine = state.routineRows.find(
            (row) => row.id === filters.id && row.user_id === filters.user_id
          );
          if (!routine) return { data: null, error: null };
          Object.assign(routine, updates);
          return { data: { id: routine.id }, error: null };
        },
      })),
    };
    return builder;
  });
  const fromMock = vi.fn((table: string) => {
    if (table === 'active_workouts') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: state.serverRow, error: null }),
          }),
        }),
        upsert: upsertMock,
        delete: activeDeleteMock,
      };
    }
    if (table === 'workout_sessions') {
      return {
        insert: historyInsertMock,
        delete: historyDeleteMock,
        select: historySelectMock,
      };
    }
    if (table === 'routines') {
      return {
        update: routineUpdateMock,
      };
    }
    if (table === 'personal_records') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }
    throw new Error(`Unexpected Supabase table: ${table}`);
  });
  return {
    state,
    pendingUpserts,
    pendingSessions,
    pendingBeacons,
    pendingHistoryInserts,
    pendingActiveDeletes,
    upsertMock,
    getSessionMock,
    getUserMock,
    fetchMock,
    fromMock,
    historyInsertMock,
    historySelectMock,
    activeDeleteMock,
    historyDeleteMock,
    routineUpdateMock,
    cancelRestPushMock: vi.fn(),
  };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: h.getSessionMock,
      getUser: h.getUserMock,
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

import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ActiveWorkoutRestTimer,
  Exercise,
  Routine,
} from './useStore';
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

const routine = (id: string, exercises: Exercise[] = []): Routine => ({
  id,
  user_id: 'u1',
  name: `Routine ${id}`,
  folder_id: null,
  exercises,
  created_at: '2026-07-01T08:00:00.000Z',
  updated_at: '2026-07-01T08:00:00.000Z',
});

const setActive = (
  exercises: ActiveWorkoutExercise[],
  overrides: Partial<ActiveWorkout> = {},
  persistedUserId = 'u1'
) => {
  const activeWorkout = workout(exercises, overrides);
  h.state.serverRow = {
    id: activeWorkout.id,
    user_id: persistedUserId,
    routine_id: activeWorkout.routineId,
    routine_name: activeWorkout.routineName,
    started_at: activeWorkout.startedAt,
    workout_data: {},
  };
  useStore.setState({
    activeWorkout,
    persistedUserId,
  });
};

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
  h.state.historyInsertError = null;
  h.state.activeDeleteError = null;
  h.state.historyDeleteError = null;
  h.state.historyLookupError = null;
  h.state.routineUpdateError = null;
  h.state.historyRows = [];
  h.state.routineRows = [];
  h.state.deferUpserts = false;
  h.state.deferSessions = false;
  h.state.deferHistoryInserts = false;
  h.state.deferActiveDeletes = false;
  h.state.historyInsertCommitsWithError = false;
  h.state.sessionUserId = 'u1';
  h.pendingUpserts.length = 0;
  h.pendingSessions.length = 0;
  h.pendingBeacons.length = 0;
  h.pendingHistoryInserts.length = 0;
  h.pendingActiveDeletes.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal('fetch', h.fetchMock);
  useStore.setState({
    activeWorkout: null,
    persistedUserId: null,
    notification: null,
    savedRoutines: [],
    workoutHistory: [],
    personalRecords: {},
  });
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

describe('terminal workout finish ownership', () => {
  it('creates one history row, deletes the active row, clears terminal state, and returns a typed candidate', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    try {
      useStore.setState({ savedRoutines: [routine('routine-1')] });
      setActive([exercise('a')], { restTimer: timer('a') });
      await useStore.getState().saveActiveWorkoutProgress();

      const result = await useStore.getState().finishWorkout();

      expect(result).toMatchObject({
        ok: true,
        routineUpdate: { routineId: 'routine-1' },
      });
      expect(h.state.historyRows).toHaveLength(1);
      expect(h.activeDeleteMock).toHaveBeenCalledTimes(1);
      expect(h.state.serverRow).toBeNull();
      expect(useStore.getState().activeWorkout).toBeNull();
      expect(h.cancelRestPushMock).toHaveBeenCalledTimes(1);
      expect(clearTimeoutSpy).toHaveBeenCalled();
    } finally {
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('returns a non-success result without writes when startup has not produced an active workout', async () => {
    const result = await useStore.getState().finishWorkout();

    expect(result).toEqual({ ok: false });
    expect(h.historyInsertMock).not.toHaveBeenCalled();
    expect(h.activeDeleteMock).not.toHaveBeenCalled();
  });

  it('preserves the recoverable active workout when history insertion fails', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    h.state.historyInsertError = { message: 'history unavailable' };

    const result = await useStore.getState().finishWorkout();

    expect(result).toEqual({ ok: false });
    expect(useStore.getState().activeWorkout).toBe(active);
    expect(h.state.historyRows).toHaveLength(0);
    expect(h.activeDeleteMock).not.toHaveBeenCalled();
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });

  it('compensates the inserted history row and preserves active state when active deletion fails', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    h.state.activeDeleteError = { message: 'active delete unavailable' };

    const result = await useStore.getState().finishWorkout();

    expect(result).toEqual({ ok: false });
    expect(h.historyInsertMock).toHaveBeenCalledTimes(1);
    expect(h.historyDeleteMock).toHaveBeenCalledTimes(1);
    expect(h.state.historyRows).toHaveLength(0);
    expect(useStore.getState().activeWorkout).toBe(active);
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });
});

describe('terminal finish retry and conflict correction', () => {
  const setCapturedActiveRow = (active: ActiveWorkout, userId = 'u1') => {
    h.state.serverRow = {
      id: active.id,
      user_id: userId,
      routine_id: active.routineId,
      routine_name: active.routineName,
      started_at: active.startedAt,
      workout_data: {},
    };
  };

  it('reuses the active UUID to reconcile an ambiguous committed history insert on retry', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    setCapturedActiveRow(active);
    h.state.historyInsertCommitsWithError = true;
    h.state.historyLookupError = { message: 'lookup unavailable' };

    expect(await useStore.getState().finishWorkout()).toEqual({ ok: false });
    expect(h.state.historyRows).toHaveLength(1);
    expect(useStore.getState().activeWorkout).toBe(active);
    expect(h.activeDeleteMock).not.toHaveBeenCalled();

    h.state.historyInsertCommitsWithError = false;
    h.state.historyLookupError = null;
    expect(await useStore.getState().finishWorkout()).toEqual({ ok: true });

    expect(h.state.historyRows).toHaveLength(1);
    expect(h.state.historyRows[0].id).toBe(active.id);
    expect(useStore.getState().activeWorkout).toBeNull();
  });

  it('inspects a fulfilled compensation error and safely reconciles it on retry', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    setCapturedActiveRow(active);
    h.state.activeDeleteError = { message: 'active delete unavailable' };
    h.state.historyDeleteError = { message: 'compensation unavailable' };

    expect(await useStore.getState().finishWorkout()).toEqual({ ok: false });
    expect(h.state.historyRows).toHaveLength(1);
    expect(useStore.getState().notification?.message).toContain('historial');
    expect(useStore.getState().activeWorkout).toBe(active);

    h.state.activeDeleteError = null;
    h.state.historyDeleteError = null;
    expect(await useStore.getState().finishWorkout()).toEqual({ ok: true });

    expect(h.state.historyRows).toHaveLength(1);
    expect(h.state.historyRows[0].id).toBe(active.id);
    expect(useStore.getState().activeWorkout).toBeNull();
  });

  it('treats a newer cross-tab active row as a zero-match conflict and preserves it', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    h.state.serverRow = {
      id: active.id,
      user_id: 'u1',
      routine_id: 'routine-2',
      routine_name: 'Newer cross-tab workout',
      started_at: '2026-07-24T09:00:00.000Z',
      workout_data: {},
    };

    expect(await useStore.getState().finishWorkout()).toEqual({ ok: false });

    expect(h.state.historyRows).toHaveLength(0);
    expect(h.state.serverRow).toMatchObject({
      id: active.id,
      started_at: '2026-07-24T09:00:00.000Z',
    });
    expect(useStore.getState().activeWorkout).toBe(active);
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });

  it('does not clear a new local owner/workout after a deferred history write', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    setCapturedActiveRow(active);
    h.state.deferHistoryInserts = true;

    const finish = useStore.getState().finishWorkout();
    await vi.waitFor(() => expect(h.pendingHistoryInserts).toHaveLength(1));
    const replacement = workout([exercise('x')], {
      id: 'active-new',
      startedAt: '2026-07-24T09:00:00.000Z',
    });
    useStore.setState({ activeWorkout: replacement, persistedUserId: 'u2' });
    h.pendingHistoryInserts[0].resolve();

    expect(await finish).toEqual({ ok: true });
    expect(useStore.getState().activeWorkout).toBe(replacement);
    expect(useStore.getState().persistedUserId).toBe('u2');
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });

  it('does not clear a new local owner/workout after a deferred conditional delete', async () => {
    const active = workout([exercise('a')]);
    useStore.setState({ activeWorkout: active, persistedUserId: 'u1' });
    setCapturedActiveRow(active);
    h.state.deferActiveDeletes = true;

    const finish = useStore.getState().finishWorkout();
    await vi.waitFor(() => expect(h.pendingActiveDeletes).toHaveLength(1));
    const replacement = workout([exercise('x')], {
      id: 'active-new',
      startedAt: '2026-07-24T09:00:00.000Z',
    });
    useStore.setState({ activeWorkout: replacement, persistedUserId: 'u2' });
    h.pendingActiveDeletes[0].resolve();

    expect(await finish).toEqual({ ok: true });
    expect(useStore.getState().activeWorkout).toBe(replacement);
    expect(useStore.getState().persistedUserId).toBe('u2');
    expect(h.cancelRestPushMock).not.toHaveBeenCalled();
  });
});

describe('originating routine template ownership', () => {
  const durableLiveExercise = () =>
    exercise('a', {
      name: 'Durable exercise',
      primaryMuscle: 'Chest',
      secondaryMuscles: ['Triceps'],
      secondaryMuscleFactor: 0.4,
      restSeconds: 75,
      imageUrl: 'transient-image',
      notes: 'Keep this note',
      includesBodyweight: true,
      trackingType: 'reps',
      supersetId: 'superset-1',
      sets: [
        {
          id: 'set-a',
          reps: 7,
          weight: 32,
          completed: false,
          rir: 1,
          cardioMetrics: { durationSeconds: 30, distanceKm: 0.1 },
          isWarmup: false,
          isFailure: true,
          restSeconds: 12,
          dropsets: [{ reps: 5, weight: 20, completed: true }],
        },
      ],
    });

  it('maps only durable fields and updates only the originating template after Yes', async () => {
    const originalOne = routine('routine-1', [
      { id: 'old', name: 'Old', muscleGroup: 'Chest', sets: [] },
    ]);
    const originalTwo = routine('routine-2', [
      { id: 'other', name: 'Other', muscleGroup: 'Back', sets: [] },
    ]);
    h.state.routineRows = [structuredClone(originalOne), structuredClone(originalTwo)];
    useStore.setState({ savedRoutines: [originalOne, originalTwo] });
    setActive([durableLiveExercise()]);

    const finishResult = await useStore.getState().finishWorkout();
    if (!finishResult.ok || !finishResult.routineUpdate) {
      throw new Error('Expected an originating routine update candidate');
    }

    expect(finishResult).toEqual({
      ok: true,
      routineUpdate: {
        routineId: 'routine-1',
        exercises: [
          {
            id: 'a',
            name: 'Durable exercise',
            muscleGroup: 'Chest',
            notes: 'Keep this note',
            sets: [
              {
                id: 'set-a',
                reps: 7,
                weight: 32,
                isWarmup: false,
                isFailure: true,
                dropsets: [{ reps: 5, weight: 20 }],
              },
            ],
            restSeconds: 75,
            secondaryMuscles: ['Triceps'],
            secondaryMuscleFactor: 0.4,
            includesBodyweight: true,
            trackingType: 'reps',
            supersetId: 'superset-1',
          },
        ],
      },
    });
    expect(h.routineUpdateMock).not.toHaveBeenCalled();

    expect(await useStore.getState().updateRoutineFromWorkout(finishResult.routineUpdate)).toBe(
      true
    );
    expect(h.routineUpdateMock).toHaveBeenCalledTimes(1);
    expect(h.state.routineRows[0].exercises).toEqual(finishResult.routineUpdate.exercises);
    expect(h.state.routineRows[1]).toEqual(originalTwo);
    expect(useStore.getState().savedRoutines[0].exercises).toEqual(
      finishResult.routineUpdate.exercises
    );
    expect(useStore.getState().savedRoutines[1]).toBe(originalTwo);
  });

  it('does not mutate a template before Yes, including No or dismissal', async () => {
    const original = routine('routine-1', [
      { id: 'old', name: 'Old', muscleGroup: 'Chest', sets: [] },
    ]);
    h.state.routineRows = [structuredClone(original)];
    useStore.setState({ savedRoutines: [original] });
    setActive([durableLiveExercise()]);

    const finishResult = await useStore.getState().finishWorkout();

    expect(finishResult).toMatchObject({
      ok: true,
      routineUpdate: { routineId: 'routine-1' },
    });
    expect(h.routineUpdateMock).not.toHaveBeenCalled();
    expect(h.state.routineRows[0]).toEqual(original);
    expect(useStore.getState().savedRoutines[0]).toBe(original);
  });

  it('reports a missing originating template without mutating unrelated routines', async () => {
    const unrelated = routine('routine-2');
    h.state.routineRows = [structuredClone(unrelated)];
    useStore.setState({ savedRoutines: [unrelated] });
    setActive([durableLiveExercise()]);
    const finishResult = await useStore.getState().finishWorkout();

    expect(finishResult).toEqual({ ok: true });
    expect(h.routineUpdateMock).not.toHaveBeenCalled();
    expect(h.state.routineRows).toEqual([unrelated]);
    expect(useStore.getState().savedRoutines).toEqual([unrelated]);
  });

  it('does not expose template eligibility for a free workout', async () => {
    setActive([durableLiveExercise()], { routineId: undefined });

    expect(await useStore.getState().finishWorkout()).toEqual({ ok: true });
    expect(h.routineUpdateMock).not.toHaveBeenCalled();
  });

  it('does not expose template eligibility for a cancelled workout', async () => {
    setActive([durableLiveExercise()]);

    await useStore.getState().cancelWorkout();

    expect(useStore.getState().activeWorkout).toBeNull();
    expect(h.state.historyRows).toHaveLength(0);
    expect(h.routineUpdateMock).not.toHaveBeenCalled();
  });

  it('does not expose template eligibility when finish fails', async () => {
    setActive([durableLiveExercise()]);
    h.state.historyInsertError = { message: 'history unavailable' };

    expect(await useStore.getState().finishWorkout()).toEqual({ ok: false });
    expect(h.routineUpdateMock).not.toHaveBeenCalled();
  });
});

describe('routine metadata when starting a workout', () => {
  it('preserves zero rest and keeps a time-based strength exercise out of cardio', async () => {
    useStore.setState({
      userData: { id: 'u1', default_rest_seconds: 90 },
      workoutHistory: [
        {
          id: 'history-1',
          user_id: 'u1',
          routine_name: 'Previous',
          started_at: '2026-08-01T08:00:00.000Z',
          completed_at: '2026-08-01T08:30:00.000Z',
          exercises_completed: [],
          total_volume: 0,
          duration_minutes: 30,
        },
      ],
    });

    const started = await useStore.getState().startWorkout(
      routine('cardio-strength', [
        {
          id: 'plank',
          name: 'Plancha',
          muscleGroup: 'Core',
          trackingType: 'time',
          activityType: 'strength',
          restSeconds: 0,
          sets: [{ id: 'plank-set', reps: 45, weight: 0 }],
        },
      ])
    );

    expect(started).toBe(true);
    expect(useStore.getState().activeWorkout?.exercises[0]).toMatchObject({
      restSeconds: 0,
      activityType: 'strength',
      trackingType: 'time',
    });
  });
});
