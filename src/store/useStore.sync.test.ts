// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mocks referenced by the vi.mock factory must be created via vi.hoisted so they
// exist before the (hoisted) factory runs.
const h = vi.hoisted(() => {
  const state: { serverRow: any; serverError: any } = { serverRow: null, serverError: null };
  const upsertMock = vi.fn(() => Promise.resolve({ error: null }));
  const fromMock = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: state.serverRow, error: state.serverError }),
      }),
    }),
    upsert: upsertMock,
  }));
  return { state, upsertMock, fromMock };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { user: { id: 'u1' }, access_token: 'tok' } } })
      ),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: h.fromMock,
  },
  getCachedAuth: () => ({ accessToken: 'tok', userId: 'u1' }),
  SUPABASE_REST_URL: 'http://localhost',
  SUPABASE_ANON_KEY: 'anon',
}));

import { useStore } from './useStore';

const ISO = (s: string) => new Date(s).toISOString();

const localWorkout = (updatedAt: string) => ({
  id: 'local-id',
  routineId: undefined,
  routineName: 'Rutina local',
  startedAt: ISO('2026-01-01T00:00:00Z'),
  exercises: [
    {
      exerciseId: 'e1',
      name: 'Press',
      primaryMuscle: 'Pecho',
      restSeconds: 90,
      sets: [{ id: 's1', reps: 8, weight: 80, completed: true }],
    },
  ],
  updatedAt,
});

const makeServerRow = (clientUpdatedAt: string, completed: boolean) => ({
  id: 'server-id',
  routine_id: null,
  routine_name: 'Rutina servidor',
  started_at: ISO('2026-01-01T00:00:00Z'),
  updated_at: clientUpdatedAt,
  workout_data: {
    exercises: [
      {
        exerciseId: 'e1',
        name: 'Press',
        sets: [{ id: 's1', reps: 8, weight: 80, completed }],
      },
    ],
    current_exercise_id: 'e1',
    current_set_index: 0,
    rest_timer: null,
    override_date: null,
    client_updated_at: clientUpdatedAt,
  },
});

beforeEach(() => {
  h.state.serverRow = null;
  h.state.serverError = null;
  h.upsertMock.mockClear();
  h.fromMock.mockClear();
  localStorage.clear();
  useStore.setState({ activeWorkout: null, persistedUserId: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('B — debounced, coalesced saves', () => {
  it('collapses several progress saves from one interaction into a single network write', async () => {
    vi.useFakeTimers();
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T10:00:00Z')),
      persistedUserId: 'u1',
    });

    // One "complete set" tap fires updateWorkoutExerciseSets + setActiveWorkoutPosition
    // + startRestTimer, i.e. saveActiveWorkoutProgress several times in a row.
    await useStore.getState().saveActiveWorkoutProgress();
    await useStore.getState().saveActiveWorkoutProgress();
    await useStore.getState().saveActiveWorkoutProgress();

    expect(h.upsertMock).not.toHaveBeenCalled(); // still within the debounce window

    await vi.advanceTimersByTimeAsync(600);

    expect(h.upsertMock).toHaveBeenCalledTimes(1);
  });

  it('stamps a client updatedAt on local state for later reconciliation', async () => {
    vi.useFakeTimers();
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T10:00:00Z')),
      persistedUserId: 'u1',
    });

    await useStore.getState().saveActiveWorkoutProgress();
    const stamped = useStore.getState().activeWorkout?.updatedAt;
    expect(typeof stamped).toBe('string');

    await vi.advanceTimersByTimeAsync(600);
    const sent = h.upsertMock.mock.calls[0][0] as any;
    expect(sent.workout_data.client_updated_at).toBe(stamped);
  });
});

describe('A — load reconciliation (no clobbering newer local state)', () => {
  it('keeps locally-newer state and pushes it up instead of overwriting from server', async () => {
    h.state.serverRow = makeServerRow(ISO('2026-01-01T10:00:00Z'), /*completed*/ false);
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T11:00:00Z')), // newer than server
      persistedUserId: 'u1',
    });

    await useStore.getState().loadActiveWorkout();

    const aw = useStore.getState().activeWorkout;
    expect(aw?.id).toBe('local-id'); // local kept, not replaced by 'server-id'
    expect(aw?.exercises[0].sets[0].completed).toBe(true); // the marked set survived
    expect(h.upsertMock).toHaveBeenCalledTimes(1); // local pushed to server
  });

  it('adopts server state when the server copy is newer', async () => {
    h.state.serverRow = makeServerRow(ISO('2026-01-01T12:00:00Z'), /*completed*/ true);
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T09:00:00Z')), // older than server
      persistedUserId: 'u1',
    });

    await useStore.getState().loadActiveWorkout();

    const aw = useStore.getState().activeWorkout;
    expect(aw?.id).toBe('server-id');
    expect(aw?.routineName).toBe('Rutina servidor');
  });

  it('recreates the row from local state when the server has none', async () => {
    h.state.serverRow = null;
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T11:00:00Z')),
      persistedUserId: 'u1',
    });

    await useStore.getState().loadActiveWorkout();

    expect(useStore.getState().activeWorkout?.id).toBe('local-id'); // not wiped
    expect(h.upsertMock).toHaveBeenCalledTimes(1); // recreated server-side
  });

  it('clears state when neither server nor local has a workout', async () => {
    h.state.serverRow = null;
    useStore.setState({ activeWorkout: null, persistedUserId: 'u1' });

    await useStore.getState().loadActiveWorkout();

    expect(useStore.getState().activeWorkout).toBeNull();
    expect(h.upsertMock).not.toHaveBeenCalled();
  });

  it('does not wipe local state on a transient fetch error', async () => {
    h.state.serverError = { message: 'network down' };
    useStore.setState({
      activeWorkout: localWorkout(ISO('2026-01-01T11:00:00Z')),
      persistedUserId: 'u1',
    });

    await useStore.getState().loadActiveWorkout();

    expect(useStore.getState().activeWorkout?.id).toBe('local-id');
  });
});
