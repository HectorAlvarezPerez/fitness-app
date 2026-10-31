// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    folderRows: [] as any[],
    routineRows: [] as any[],
    routineInsertCount: 0,
    failRoutineInsertAt: null as number | null,
  };

  const getUser = vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }));

  const rowsFor = (table: string) =>
    table === 'routine_folders' ? state.folderRows : state.routineRows;

  const selectBuilder = (table: string) => {
    const filters: Record<string, unknown> = {};
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn((field: string, value: unknown) => {
        filters[field] = value;
        return builder;
      }),
      order: vi.fn(() => {
        const rows = rowsFor(table).filter((row) =>
          Object.entries(filters).every(([field, value]) => row[field] === value)
        );
        return Promise.resolve({ data: rows, error: null });
      }),
    };
    return builder;
  };

  const from = vi.fn((table: string) => {
    if (table !== 'routine_folders' && table !== 'routines') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      select: vi.fn(() => selectBuilder(table)),
      insert: vi.fn((payloads: any[]) => {
        const payload = payloads[0];
        if (table === 'routine_folders') {
          const row = {
            id: `folder-${state.folderRows.length + 1}`,
            created_at: '2026-08-26T10:00:00.000Z',
            updated_at: '2026-08-26T10:00:00.000Z',
            ...payload,
          };
          state.folderRows.push(row);
          const result = Promise.resolve({ data: row, error: null });
          return { select: () => ({ single: () => result }) };
        }

        state.routineInsertCount += 1;
        if (state.failRoutineInsertAt === state.routineInsertCount) {
          return Promise.resolve({
            data: null,
            error: { message: 'routine insert failed' },
          });
        }
        state.routineRows.push({
          id: `routine-${state.routineRows.length + 1}`,
          created_at: '2026-08-26T10:00:00.000Z',
          updated_at: '2026-08-26T10:00:00.000Z',
          ...payload,
        });
        return Promise.resolve({ data: null, error: null });
      }),
    };
  });

  return { state, getUser, from };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: h.getUser },
    from: h.from,
  },
  getCachedAuth: () => ({ accessToken: 'token', userId: 'u1' }),
  SUPABASE_REST_URL: 'http://localhost',
  SUPABASE_ANON_KEY: 'anon',
}));

vi.mock('../lib/push', () => ({
  scheduleRestPush: vi.fn(),
  cancelRestPush: vi.fn(),
}));

import { useStore } from './useStore';

beforeEach(() => {
  localStorage.clear();
  h.state.folderRows = [];
  h.state.routineRows = [];
  h.state.routineInsertCount = 0;
  h.state.failRoutineInsertAt = null;
  h.getUser.mockClear();
  h.from.mockClear();
  useStore.setState({
    routineFolders: [],
    savedRoutines: [],
  });
});

describe('training plan import', () => {
  it('is idempotent and shares concurrent imports', async () => {
    const first = useStore.getState().installTrainingPlan();
    const concurrent = useStore.getState().installTrainingPlan();
    expect(concurrent).toBe(first);

    await expect(first).resolves.toMatchObject({ ok: true, created: 6, skipped: 0 });
    expect(h.state.folderRows).toHaveLength(1);
    expect(h.state.routineRows).toHaveLength(6);

    await expect(useStore.getState().installTrainingPlan()).resolves.toMatchObject({
      ok: true,
      created: 0,
      skipped: 6,
    });
    expect(h.state.folderRows).toHaveLength(1);
    expect(h.state.routineRows).toHaveLength(6);
  });

  it('reports partial persistence failures without claiming all routines were imported', async () => {
    h.state.failRoutineInsertAt = 3;

    await expect(useStore.getState().installTrainingPlan()).resolves.toMatchObject({
      ok: false,
      created: 2,
      skipped: 0,
      error: 'No se pudo importar el plan: routine insert failed',
    });
    expect(h.state.routineRows).toHaveLength(2);
  });
});
