// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  type Response = { data: any; error: any };

  const state: {
    userId: string | null;
    authError: any;
    authErrorDataNull: boolean;
    responses: Record<string, Response>;
  } = {
    userId: 'u1',
    authError: null,
    authErrorDataNull: true,
    responses: {},
  };

  const queryByTable = new Map<string, any>();
  const fromMock = vi.fn((table: string) => {
    const response = () =>
      Promise.resolve(state.responses[table] ?? { data: [], error: null });
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => response()),
      single: vi.fn(() => response()),
      maybeSingle: vi.fn(() => response()),
      upsert: vi.fn(() => response()),
      then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) =>
        response().then(resolve, reject),
    };
    queryByTable.set(table, query);
    return query;
  });

  const user = () =>
    state.userId
      ? {
          id: state.userId,
          email: `${state.userId}@example.com`,
          app_metadata: { provider: 'email' },
          user_metadata: {},
        }
      : null;

  return {
    state,
    fromMock,
    queryByTable,
    getSession: vi.fn(() =>
      Promise.resolve(
        state.authError
          ? {
              data: state.authErrorDataNull ? null : { session: null },
              error: state.authError,
            }
          : { data: { session: state.userId ? { user: user() } : null }, error: null }
      )
    ),
    getUser: vi.fn(() =>
      Promise.resolve(
        state.authError
          ? {
              data: state.authErrorDataNull ? null : { user: null },
              error: state.authError,
            }
          : { data: { user: user() }, error: null }
      )
    ),
  };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      getUser: h.getUser,
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: h.fromMock,
  },
  getCachedAuth: () => ({ accessToken: 'tok', userId: h.state.userId }),
  SUPABASE_REST_URL: 'http://localhost',
  SUPABASE_ANON_KEY: 'anon',
}));

import { useStore } from './useStore';

const oldRoutine = {
  id: 'old-routine',
  user_id: 'u1',
  name: 'Old routine',
  exercises: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const oldFolder = {
  id: 'old-folder',
  user_id: 'u1',
  name: 'Old folder',
  order_index: 0,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const oldSession = {
  id: 'old-session',
  user_id: 'u1',
  routine_name: 'Old session',
  started_at: '2026-01-01',
  completed_at: '2026-01-01',
  exercises_completed: [],
  total_volume: 100,
  duration_minutes: 30,
};

const oldWorkout = {
  id: 'old-workout',
  routineName: 'Old workout',
  startedAt: '2026-01-01',
  exercises: [],
};

const oldMeasurement = {
  id: 'old-measurement',
  user_id: 'u1',
  date: '2026-01-01',
  weight: 80,
  created_at: '2026-01-01',
};

const seedSlices = () =>
  useStore.setState({
    userData: { id: 'old-user', default_rest_seconds: 120 },
    savedRoutines: [oldRoutine],
    routineFolders: [oldFolder],
    workoutHistory: [oldSession],
    activeWorkout: oldWorkout,
    persistedUserId: 'u1',
    bodyMeasurements: [oldMeasurement],
    personalRecords: { Press: { weight: 100, reps: 5, date: '2026-01-01' } },
  });

const readSlices = () => {
  const state = useStore.getState();
  return {
    userData: state.userData,
    savedRoutines: state.savedRoutines,
    routineFolders: state.routineFolders,
    workoutHistory: state.workoutHistory,
    activeWorkout: state.activeWorkout,
    persistedUserId: state.persistedUserId,
    bodyMeasurements: state.bodyMeasurements,
    personalRecords: state.personalRecords,
  };
};

const loadAll = (context: { userId: string; isCurrent: () => boolean }) => {
  const state = useStore.getState();
  return Promise.all([
    state.loadUserData(context),
    state.loadRoutines(context),
    state.loadFolders(context),
    state.loadWorkoutHistory(context),
    state.loadActiveWorkout(context),
    state.loadBodyMeasurements(context),
    state.loadPersonalRecords(context),
  ]);
};

beforeEach(() => {
  h.state.userId = 'u1';
  h.state.authError = null;
  h.state.authErrorDataNull = true;
  h.state.responses = {};
  h.fromMock.mockClear();
  h.getSession.mockClear();
  h.getUser.mockClear();
  h.queryByTable.clear();
  localStorage.clear();
  seedSlices();
});

describe('contextual bootstrap loader identity guards', () => {
  it('returns signed-out for all seven loaders before querying or mutating', async () => {
    h.state.userId = null;
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });

    expect(results).toEqual(
      Array.from({ length: 7 }, () => ({ ok: false, reason: 'signed-out' }))
    );
    expect(h.fromMock).not.toHaveBeenCalled();
    expect(readSlices()).toEqual(before);
  });

  it('returns stale for a different authenticated user before querying or mutating', async () => {
    h.state.userId = 'u2';
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });

    expect(results).toEqual(Array.from({ length: 7 }, () => ({ ok: false, reason: 'stale' })));
    expect(h.fromMock).not.toHaveBeenCalled();
    expect(readSlices()).toEqual(before);
  });

  it('returns stale when the generation is already obsolete before querying', async () => {
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => false });

    expect(results).toEqual(Array.from({ length: 7 }, () => ({ ok: false, reason: 'stale' })));
    expect(h.fromMock).not.toHaveBeenCalled();
    expect(readSlices()).toEqual(before);
  });

  it('returns request-failed for explicit auth errors before querying or mutating', async () => {
    h.state.authError = { message: 'auth unavailable' };
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });

    expect(results).toEqual(
      Array.from({ length: 7 }, () => ({ ok: false, reason: 'request-failed' }))
    );
    expect(h.fromMock).not.toHaveBeenCalled();
    expect(readSlices()).toEqual(before);
  });

  it('prefers an explicit auth error over an empty auth data envelope', async () => {
    h.state.authError = { message: 'auth unavailable' };
    h.state.authErrorDataNull = false;
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });

    expect(results).toEqual(
      Array.from({ length: 7 }, () => ({ ok: false, reason: 'request-failed' }))
    );
    expect(h.fromMock).not.toHaveBeenCalled();
    expect(readSlices()).toEqual(before);
  });
});

describe('contextual bootstrap loader result and commit contract', () => {
  it('returns request-failed and retains every previous slice', async () => {
    h.state.responses = Object.fromEntries(
      [
        'profiles',
        'routines',
        'routine_folders',
        'workout_sessions',
        'active_workouts',
        'body_measurements',
        'personal_records',
      ].map((table) => [table, { data: null, error: { message: `${table} failed` } }])
    );
    const before = readSlices();

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });

    expect(results).toEqual(
      Array.from({ length: 7 }, () => ({ ok: false, reason: 'request-failed' }))
    );
    expect(readSlices()).toEqual(before);
  });

  it('commits successful empty reads and returns ok for all seven loaders', async () => {
    h.state.responses = {
      profiles: { data: null, error: null },
      routines: { data: [], error: null },
      routine_folders: { data: [], error: null },
      workout_sessions: { data: [], error: null },
      active_workouts: { data: null, error: null },
      body_measurements: { data: [], error: null },
      personal_records: { data: [], error: null },
    };
    useStore.setState({ persistedUserId: 'old-user' });

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });
    const state = useStore.getState();

    expect(results).toEqual(Array.from({ length: 7 }, () => ({ ok: true })));
    expect(state.userData).toMatchObject({ id: 'u1', default_rest_seconds: 90 });
    expect(state.savedRoutines).toEqual([]);
    expect(state.routineFolders).toEqual([]);
    expect(state.workoutHistory).toEqual([]);
    expect(state.activeWorkout).toBeNull();
    expect(state.persistedUserId).toBe('u1');
    expect(state.bodyMeasurements).toEqual([]);
    expect(state.personalRecords).toEqual({});
  });

  it('commits non-empty successful reads for the current authenticated user', async () => {
    h.state.responses = {
      profiles: {
        data: {
          default_rest_seconds: 60,
          default_sets_count: 4,
          default_reps_count: 8,
          default_weight_kg: 30,
        },
        error: null,
      },
      routines: { data: [{ ...oldRoutine, id: 'new-routine' }], error: null },
      routine_folders: { data: [{ ...oldFolder, id: 'new-folder' }], error: null },
      workout_sessions: { data: [{ ...oldSession, id: 'new-session' }], error: null },
      active_workouts: {
        data: {
          id: 'new-workout',
          routine_id: null,
          routine_name: 'New workout',
          started_at: '2026-01-02',
          workout_data: { exercises: [] },
        },
        error: null,
      },
      body_measurements: {
        data: [{ ...oldMeasurement, id: 'new-measurement' }],
        error: null,
      },
      personal_records: {
        data: [{ exercise_name: 'Squat', weight: 150, reps: 3, date: '2026-01-02' }],
        error: null,
      },
    };
    useStore.setState({ persistedUserId: 'old-user' });

    const results = await loadAll({ userId: 'u1', isCurrent: () => true });
    const state = useStore.getState();

    expect(results).toEqual(Array.from({ length: 7 }, () => ({ ok: true })));
    expect(state.userData).toMatchObject({ id: 'u1', default_rest_seconds: 60 });
    expect(state.savedRoutines[0].id).toBe('new-routine');
    expect(state.routineFolders[0].id).toBe('new-folder');
    expect(state.workoutHistory[0].id).toBe('new-session');
    expect(state.activeWorkout?.id).toBe('new-workout');
    expect(state.persistedUserId).toBe('u1');
    expect(state.bodyMeasurements[0].id).toBe('new-measurement');
    expect(state.personalRecords).toEqual({
      Squat: { weight: 150, reps: 3, date: '2026-01-02' },
    });
  });

  it('rejects all post-query commits when the generation becomes stale', async () => {
    h.state.responses = {
      profiles: { data: { default_rest_seconds: 60 }, error: null },
      routines: { data: [{ ...oldRoutine, id: 'new-routine' }], error: null },
      routine_folders: { data: [{ ...oldFolder, id: 'new-folder' }], error: null },
      workout_sessions: { data: [{ ...oldSession, id: 'new-session' }], error: null },
      active_workouts: {
        data: {
          id: 'new-workout',
          routine_id: null,
          routine_name: 'New workout',
          started_at: '2026-01-02',
          workout_data: { exercises: [] },
        },
        error: null,
      },
      body_measurements: {
        data: [{ ...oldMeasurement, id: 'new-measurement' }],
        error: null,
      },
      personal_records: {
        data: [{ exercise_name: 'Squat', weight: 150, reps: 3, date: '2026-01-02' }],
        error: null,
      },
    };
    const before = readSlices();
    const contexts = Array.from({ length: 7 }, () => {
      let checks = 0;
      return { userId: 'u1', isCurrent: () => ++checks === 1 };
    });
    const state = useStore.getState();

    const results = await Promise.all([
      state.loadUserData(contexts[0]),
      state.loadRoutines(contexts[1]),
      state.loadFolders(contexts[2]),
      state.loadWorkoutHistory(contexts[3]),
      state.loadActiveWorkout(contexts[4]),
      state.loadBodyMeasurements(contexts[5]),
      state.loadPersonalRecords(contexts[6]),
    ]);

    expect(results).toEqual(Array.from({ length: 7 }, () => ({ ok: false, reason: 'stale' })));
    expect(readSlices()).toEqual(before);
  });
});

describe('legacy no-context signed-out behavior', () => {
  it('clears only user data and active-workout identity while retaining other slices', async () => {
    h.state.userId = null;

    const state = useStore.getState();
    await Promise.all([
      state.loadUserData(),
      state.loadRoutines(),
      state.loadFolders(),
      state.loadWorkoutHistory(),
      state.loadActiveWorkout(),
      state.loadBodyMeasurements(),
      state.loadPersonalRecords(),
    ]);
    const after = useStore.getState();

    expect(after.userData).toBeNull();
    expect(after.activeWorkout).toBeNull();
    expect(after.persistedUserId).toBeNull();
    expect(after.savedRoutines).toEqual([oldRoutine]);
    expect(after.routineFolders).toEqual([oldFolder]);
    expect(after.workoutHistory).toEqual([oldSession]);
    expect(after.bodyMeasurements).toEqual([oldMeasurement]);
    expect(after.personalRecords).toEqual({
      Press: { weight: 100, reps: 5, date: '2026-01-01' },
    });
  });
});
