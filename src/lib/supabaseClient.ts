import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL WARNING: Missing Supabase environment variables. Detailed logs:');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Defined' : 'Undefined/Empty');
    console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Defined' : 'Undefined/Empty');
    // We do not throw here to allow the app to render the error boundary or landing page.
    // However, Supabase calls will likely fail.
}

// Fallback to empty strings to prevent createClient from crashing if they are strictly required to be strings.
// This allows the module to evaluate so React can at least mount.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
