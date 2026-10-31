import type { CachedUserData } from '../store/useStore';

const DATABASE_NAME = 'fitness-app-user-data';
const STORE_NAME = 'users';
const DATABASE_VERSION = 1;
const CACHE_VERSION = 1;
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;
const pendingMutations = new Map<string, Promise<void>>();

export type UserDataCacheSnapshot = {
  version: typeof CACHE_VERSION;
  userId: string;
  savedAt: number;
  data: CachedUserData;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown) => typeof value === 'string';
const isOptionalString = (value: unknown) =>
  value === undefined || value === null || isString(value);
const isFiniteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const isRoutine = (value: unknown, userId: string) =>
  isRecord(value) &&
  isString(value.id) &&
  value.user_id === userId &&
  isString(value.name) &&
  isOptionalString(value.folder_id) &&
  isString(value.created_at) &&
  isString(value.updated_at) &&
  Array.isArray(value.exercises) &&
  value.exercises.every(
    (exercise) =>
      isRecord(exercise) &&
      isString(exercise.id) &&
      isString(exercise.name) &&
      isString(exercise.muscleGroup) &&
      Array.isArray(exercise.sets) &&
      exercise.sets.every(
        (set) => isRecord(set) && isFiniteNumber(set.reps) && isFiniteNumber(set.weight)
      )
  );

const isRoutineFolder = (value: unknown, userId: string) =>
  isRecord(value) &&
  isString(value.id) &&
  value.user_id === userId &&
  isString(value.name) &&
  isFiniteNumber(value.order_index) &&
  isString(value.created_at) &&
  isString(value.updated_at);

const isWorkoutSession = (value: unknown, userId: string) =>
  isRecord(value) &&
  isString(value.id) &&
  value.user_id === userId &&
  isString(value.routine_name) &&
  isString(value.started_at) &&
  isString(value.completed_at) &&
  Number.isFinite(Date.parse(value.completed_at)) &&
  isFiniteNumber(value.total_volume) &&
  isFiniteNumber(value.duration_minutes) &&
  Array.isArray(value.exercises_completed);

const isBodyMeasurement = (value: unknown, userId: string) =>
  isRecord(value) &&
  isString(value.id) &&
  value.user_id === userId &&
  isString(value.date) &&
  isString(value.created_at);

const isCachedUserData = (value: unknown, userId: string): value is CachedUserData => {
  if (!isRecord(value)) return false;

  const stats = value.stats;
  const userData = value.userData;
  return (
    (userData === null || (isRecord(userData) && userData.id === userId)) &&
    Array.isArray(value.savedRoutines) &&
    value.savedRoutines.every((routine) => isRoutine(routine, userId)) &&
    Array.isArray(value.routineFolders) &&
    value.routineFolders.every((folder) => isRoutineFolder(folder, userId)) &&
    Array.isArray(value.workoutHistory) &&
    value.workoutHistory.every((session) => isWorkoutSession(session, userId)) &&
    isRecord(stats) &&
    Number.isFinite(stats.recovery) &&
    Number.isFinite(stats.totalVolume) &&
    Number.isFinite(stats.consistency) &&
    Number.isFinite(stats.streak) &&
    Array.isArray(value.bodyMeasurements) &&
    value.bodyMeasurements.every((measurement) => isBodyMeasurement(measurement, userId)) &&
    isRecord(value.personalRecords) &&
    Object.values(value.personalRecords).every(
      (record) =>
        isRecord(record) &&
        isFiniteNumber(record.weight) &&
        isFiniteNumber(record.reps) &&
        isString(record.date)
    )
  );
};

const enqueueMutation = (userId: string, mutation: () => Promise<void>): Promise<void> => {
  const previous = pendingMutations.get(userId) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(mutation);
  const settledOperation = operation.then(
    () => undefined,
    () => undefined
  );
  pendingMutations.set(userId, settledOperation);
  void settledOperation.then(() => {
    if (pendingMutations.get(userId) === settledOperation) pendingMutations.delete(userId);
  });
  return operation;
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let wasBlocked = false;
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => {
      if (wasBlocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'));
    request.onblocked = () => {
      wasBlocked = true;
      reject(new Error('Opening IndexedDB was blocked'));
    };
  });

const readSnapshot = (database: IDBDatabase, userId: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not read cached data'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Cache read was aborted'));
  });

const writeSnapshot = (database: IDBDatabase, snapshot: UserDataCacheSnapshot): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(snapshot);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not write cache'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Cache write was aborted'));
  });

const deleteSnapshot = (database: IDBDatabase, userId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete cache'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Cache deletion was aborted'));
  });

export const readUserDataCache = async (userId: string): Promise<UserDataCacheSnapshot | null> => {
  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase();
    const snapshot = await readSnapshot(database, userId);
    if (
      !isRecord(snapshot) ||
      snapshot.version !== CACHE_VERSION ||
      snapshot.userId !== userId ||
      !Number.isFinite(snapshot.savedAt) ||
      !isCachedUserData(snapshot.data, userId)
    ) {
      return null;
    }

    const age = Date.now() - (snapshot.savedAt as number);
    if (age > MAX_CACHE_AGE_MS || age < -CLOCK_SKEW_TOLERANCE_MS) return null;

    return snapshot as UserDataCacheSnapshot;
  } catch {
    // Storage is an optional startup optimization; failed/private-mode IndexedDB
    // must fall back to the normal authenticated network bootstrap.
    return null;
  } finally {
    database?.close();
  }
};

export const writeUserDataCache = (userId: string, data: CachedUserData): Promise<void> =>
  enqueueMutation(userId, async () => {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase();
      await writeSnapshot(database, {
        version: CACHE_VERSION,
        userId,
        savedAt: Date.now(),
        data,
      });
    } catch {
      // Cache writes are best-effort and must never block a successful login.
    } finally {
      database?.close();
    }
  });

export const deleteUserDataCache = (userId: string): Promise<void> =>
  enqueueMutation(userId, async () => {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase();
      await deleteSnapshot(database, userId);
    } catch {
      // Cache cleanup is best-effort; no auth or store transition depends on it.
    } finally {
      database?.close();
    }
  });
