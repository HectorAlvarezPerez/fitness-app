// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  type UpdateRecord = {
    payload: Record<string, unknown>;
    filters: Array<[string, unknown]>;
  };

  const state = {
    userId: 'u1' as string | null,
    updateErrors: [] as Array<unknown>,
    updateRecords: [] as UpdateRecord[],
  };

  const fromMock = vi.fn((table: string) => {
    if (table !== 'routine_folders') throw new Error(`Unexpected table: ${table}`);

    return {
      update: vi.fn((payload: Record<string, unknown>) => {
        const record: UpdateRecord = { payload, filters: [] };
        const index = state.updateRecords.push(record) - 1;
        const query: any = {
          eq: vi.fn((field: string, value: unknown) => {
            record.filters.push([field, value]);
            return query;
          }),
          then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve({ error: state.updateErrors[index] ?? null }).then(resolve, reject),
        };
        return query;
      }),
    };
  });

  return {
    state,
    fromMock,
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: state.userId ? { id: state.userId } : null },
        error: null,
      })
    ),
  };
});

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
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

import { type LoadResult, type RoutineFolder, useStore } from './useStore';

const folder = (id: string, orderIndex: number, userId = 'u1'): RoutineFolder => ({
  id,
  user_id: userId,
  name: `Folder ${id}`,
  order_index: orderIndex,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
});

const original = useStore.getState();

const installCanonicalReload = (folders: RoutineFolder[], result: LoadResult = { ok: true }) => {
  const reload = vi.fn(async () => {
    if (result.ok) useStore.setState({ routineFolders: folders });
    return result;
  });
  useStore.setState({ loadFolders: reload });
  return reload;
};

beforeEach(() => {
  h.state.userId = 'u1';
  h.state.updateErrors = [];
  h.state.updateRecords = [];
  h.fromMock.mockClear();
  h.getUser.mockClear();
  localStorage.clear();
  useStore.setState({
    routineFolders: [folder('a', 1), folder('b', 2), folder('c', 3)],
    loadFolders: original.loadFolders,
  });
});

describe('routine folder ordering', () => {
  it('persists a complete reordered id list with 1-based indexes scoped to the user', async () => {
    const canonical = [folder('c', 1), folder('a', 2), folder('b', 3)];
    const reload = installCanonicalReload(canonical);

    const result = await useStore.getState().reorderFolders(['c', 'a', 'b']);

    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith({ userId: 'u1', isCurrent: expect.any(Function) });
    expect(h.state.updateRecords).toEqual([
      {
        payload: { order_index: 1 },
        filters: [
          ['id', 'c'],
          ['user_id', 'u1'],
        ],
      },
      {
        payload: { order_index: 2 },
        filters: [
          ['id', 'a'],
          ['user_id', 'u1'],
        ],
      },
      {
        payload: { order_index: 3 },
        filters: [
          ['id', 'b'],
          ['user_id', 'u1'],
        ],
      },
    ]);
    expect(useStore.getState().routineFolders).toEqual(canonical);
  });

  it.each([
    ['missing id', ['a', 'b']],
    ['duplicate id', ['a', 'a', 'c']],
    ['unknown id', ['a', 'b', 'missing']],
  ])('rejects an invalid list (%s) without writing', async (_label, ids) => {
    const before = useStore.getState().routineFolders;

    const result = await useStore.getState().reorderFolders(ids);

    expect(result).toBe(false);
    expect(h.state.updateRecords).toEqual([]);
    expect(useStore.getState().routineFolders).toEqual(before);
  });

  it('compensates successful writes before reloading after a partial persistence failure', async () => {
    h.state.updateErrors = [null, null, { message: 'offline' }, null, null];
    const canonical = [folder('a', 1), folder('b', 2), folder('c', 3)];
    const reload = installCanonicalReload(canonical);

    const result = await useStore.getState().reorderFolders(['c', 'a', 'b']);

    expect(result).toBe(false);
    expect(h.state.updateRecords.map((record) => record.payload)).toEqual([
      { order_index: 1 },
      { order_index: 2 },
      { order_index: 3 },
      { order_index: 1 },
      { order_index: 3 },
    ]);
    expect(h.state.updateRecords.slice(3).map((record) => record.filters)).toEqual([
      [
        ['id', 'a'],
        ['user_id', 'u1'],
      ],
      [
        ['id', 'c'],
        ['user_id', 'u1'],
      ],
    ]);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(useStore.getState().routineFolders).toEqual(canonical);
  });

  it('reports failure and keeps local state unchanged when the canonical success reload fails', async () => {
    const before = useStore.getState().routineFolders;
    const reload = installCanonicalReload(before, { ok: false, reason: 'request-failed' });

    const result = await useStore.getState().reorderFolders(['c', 'a', 'b']);

    expect(result).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(useStore.getState().routineFolders).toEqual(before);
  });

  it('rejects folders that do not belong to the authenticated user', async () => {
    useStore.setState({ routineFolders: [folder('a', 1), folder('b', 2, 'u2')] });

    const result = await useStore.getState().reorderFolders(['b', 'a']);

    expect(result).toBe(false);
    expect(h.state.updateRecords).toEqual([]);
  });
});
