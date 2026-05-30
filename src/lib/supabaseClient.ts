import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('CRITICAL WARNING: Missing Supabase anon key. Detailed logs:');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Defined/Fallback origin' : 'Undefined/Empty');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Defined' : 'Undefined/Empty');
  // We do not throw here to allow the app to render the error boundary or landing page.
  // However, Supabase calls will likely fail.
}

// Fallback to empty strings to prevent createClient from crashing if they are strictly required to be strings.
// This allows the module to evaluate so React can at least mount.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Resolved REST base + anon key, exported for low-level fetch (e.g. keepalive beacon
// flushes on pagehide that cannot wait for the async supabase-js client).
export const SUPABASE_REST_URL = supabaseUrl || window.location.origin;
export const SUPABASE_ANON_KEY = supabaseAnonKey || '';

// Synchronous cache of the current session token/user, kept fresh by the auth
// listener below. Used by best-effort flushes that run while the page is being
// suspended, where awaiting supabase.auth.getSession() is not reliable.
let cachedAccessToken: string | null = null;
let cachedUserId: string | null = null;

void supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data.session?.access_token ?? null;
  cachedUserId = data.session?.user?.id ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
  cachedUserId = session?.user?.id ?? null;
});

export const getCachedAuth = () => ({
  accessToken: cachedAccessToken,
  userId: cachedUserId,
});
