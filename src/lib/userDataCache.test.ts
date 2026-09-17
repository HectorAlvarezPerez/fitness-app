import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteUserDataCache, readUserDataCache, writeUserDataCache } from './userDataCache';
import type { CachedUserData } from '../store/useStore';

type FakeDatabaseState = {
  records: Map<string, unknown>;
  deleteTransactions: number;
  blockNextWrite: (gate: Promise<void>) => void;
  waitForWrite: () => Promise<void>;
};

const createFakeIndexedDb = () => {
  const stores = new Map<string, Map<string, unknown>>();
  const storeNames = new Set<string>();
  const records = new Map<string, unknown>();
  let pendingWriteGate: Promise<void> | null = null;
  let signalWriteStarted!: () => void;
  let writeStarted = new Promise<void>((resolve) => {
    signalWriteStarted = resolve;
  });
  let deleteTransactions = 0;

  const database = {
    objectStoreNames: { contains: (name: string) => storeNames.has(name) },
    createObjectStore: (name: string) => {
      storeNames.add(name);
      stores.set(name, records);
      return {};
    },
    close: vi.fn(),
    transaction: (storeName: string) => {
      const transaction = {
        error: null,
        onabort: null as ((event: Event) => void) | null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        objectStore: () => {
          const store = stores.get(storeName)!;
          return {
            get: (key: string) => {
              const request = {
                result: undefined as unknown,
                error: null,
                onsuccess: null as ((event: Event) => void) | null,
                onerror: null as ((event: Event) => void) | null,
              };
              queueMicrotask(() => {
                request.result = store.get(key);
                request.onsuccess?.(new Event('success'));
                queueMicrotask(() => transaction.oncomplete?.(new Event('complete')));
              });
              return request;
            },
            put: (value: { userId: string }) => {
              const gate = pendingWriteGate;
              pendingWriteGate = null;
              signalWriteStarted();
              const commit = () => {
                const copy = structuredClone(value);
                store.set(value.userId, copy);
                records.set(value.userId, copy);
                queueMicrotask(() => transaction.oncomplete?.(new Event('complete')));
              };
              if (gate) void gate.then(commit);
              else queueMicrotask(commit);
              return {};
            },
            delete: (key: string) => {
              deleteTransactions += 1;
              queueMicrotask(() => {
                store.delete(key);
                records.delete(key);
                transaction.oncomplete?.(new Event('complete'));
              });
              return {};
            },
          };
        },
      };
      return transaction;
    },
  };

  const indexedDb = {
    open: () => {
      const request: {
        result: typeof database;
        error: DOMException | null;
        onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
        onsuccess: ((event: Event) => void) | null;
        onerror: ((event: Event) => void) | null;
        onblocked: ((event: Event) => void) | null;
      } = {
        result: database,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
      };
      queueMicrotask(() => {
        if (!storeNames.has('users')) {
          request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent);
        }
        request.onsuccess?.(new Event('success'));
      });
      return request;
    },
  };

  const state: FakeDatabaseState = {
    records,
    get deleteTransactions() {
      return deleteTransactions;
    },
    blockNextWrite: (gate) => {
      pendingWriteGate = gate;
      writeStarted = new Promise<void>((resolve) => {
        signalWriteStarted = resolve;
      });
    },
    waitForWrite: () => writeStarted,
  };

  return { indexedDb, state };
};

const cachedUserData = (userId = 'u1'): CachedUserData => ({
  userData: { id: userId },
  savedRoutines: [
    {
      id: 'routine-1',
      user_id: userId,
      name: 'Upper',
      exercises: [
        { id: 'press', name: 'Press', muscleGroup: 'chest', sets: [{ reps: 8, weight: 40 }] },
      ],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  routineFolders: [
    {
      id: 'folder-1',
      user_id: userId,
      name: 'Plan',
      order_index: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ],
  workoutHistory: [
    {
      id: 'session-1',
      user_id: userId,
      routine_name: 'Upper',
      started_at: '2026-01-01T10:00:00Z',
      completed_at: '2026-01-01T11:00:00Z',
      exercises_completed: [],
      total_volume: 100,
      duration_minutes: 60,
    },
  ],
  stats: { recovery: 80, totalVolume: 100, consistency: 33, streak: 1 },
  bodyMeasurements: [
    { id: 'measurement-1', user_id: userId, date: '2026-01-01', created_at: '2026-01-01' },
  ],
  personalRecords: { Press: { weight: 40, reps: 8, date: '2026-01-01' } },
});

afterEach(() => vi.unstubAllGlobals());

describe('user data cache', () => {
  it('reads valid user-scoped data and rejects expired or malformed snapshots', async () => {
    const { indexedDb, state } = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', indexedDb);

    await writeUserDataCache('u1', cachedUserData());
    expect(await readUserDataCache('u1')).toMatchObject({ userId: 'u1', data: cachedUserData() });
    expect(await readUserDataCache('u2')).toBeNull();

    const snapshot = state.records.get('u1') as { savedAt: number; data: CachedUserData };
    state.records.set('u1', { ...snapshot, savedAt: Date.now() - 25 * 60 * 60 * 1000 });
    expect(await readUserDataCache('u1')).toBeNull();

    state.records.set('u1', {
      ...snapshot,
      savedAt: Date.now(),
      data: { ...snapshot.data, workoutHistory: [null] },
    });
    expect(await readUserDataCache('u1')).toBeNull();
  });

  it('rejects records owned by another user inside a matching cache snapshot', async () => {
    const { indexedDb, state } = createFakeIndexedDb();
    vi.stubGlobal('indexedDB', indexedDb);

    await writeUserDataCache('u1', cachedUserData());
    const snapshot = state.records.get('u1') as {
      data: CachedUserData;
      [key: string]: unknown;
    };
    state.records.set('u1', {
      ...snapshot,
      data: {
        ...snapshot.data,
        savedRoutines: snapshot.data.savedRoutines.map((routine) => ({
          ...routine,
          user_id: 'u2',
        })),
        routineFolders: snapshot.data.routineFolders.map((folder) => ({
          ...folder,
          user_id: 'u2',
        })),
        workoutHistory: snapshot.data.workoutHistory.map((session) => ({
          ...session,
          user_id: 'u2',
        })),
        bodyMeasurements: snapshot.data.bodyMeasurements.map((measurement) => ({
          ...measurement,
          user_id: 'u2',
        })),
      },
    });

    expect(await readUserDataCache('u1')).toBeNull();
  });

  it('does not allow a pending write to recreate cache after sign-out deletion', async () => {
    const { indexedDb, state } = createFakeIndexedDb();
    let releaseWrite!: () => void;
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    state.blockNextWrite(writeGate);
    vi.stubGlobal('indexedDB', indexedDb);

    const write = writeUserDataCache('logout-user', cachedUserData('logout-user'));
    await state.waitForWrite();
    const deletion = deleteUserDataCache('logout-user');
    await Promise.resolve();

    expect(state.deleteTransactions).toBe(0);
    releaseWrite();
    await Promise.all([write, deletion]);

    expect(state.deleteTransactions).toBe(1);
    expect(state.records.has('logout-user')).toBe(false);
  });

  it('treats unavailable IndexedDB as an optional cache miss', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(readUserDataCache('u1')).resolves.toBeNull();
    await expect(writeUserDataCache('u1', cachedUserData())).resolves.toBeUndefined();
    await expect(deleteUserDataCache('u1')).resolves.toBeUndefined();
  });
});
