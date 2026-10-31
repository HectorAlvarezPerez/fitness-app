import { previewExercises } from './store';

const makeQueryResult = (rows: unknown[]) => {
  let currentRows = rows;
  const result = {
    select: () => result,
    eq: (column: string, value: unknown) => {
      currentRows = rows.filter(
        (row) =>
          row && typeof row === 'object' && (row as Record<string, unknown>)[column] === value
      );
      return result;
    },
    order: () => result,
    limit: () => result,
    insert: () => result,
    update: () => result,
    delete: () => result,
    upsert: () => result,
    single: async () => ({ data: currentRows[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: currentRows[0] ?? null, error: null }),
    then: (
      resolve: (value: { data: unknown[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve({ data: currentRows, error: null }).then(resolve, reject),
  };

  return result;
};

export const supabase = {
  auth: {
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: { id: 'preview-user' } }, error: null }),
    updateUser: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
  },
  from: (table: string) =>
    table === 'exercises'
      ? makeQueryResult(previewExercises)
      : makeQueryResult([]),
};

export const getCachedAuth = () => ({ accessToken: null, userId: null });
export const SUPABASE_REST_URL = 'http://preview.invalid';
export const SUPABASE_ANON_KEY = 'preview-only';
