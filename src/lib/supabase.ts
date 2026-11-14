import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only public credentials belong here. Never use a service-role/secret key in Vite.
export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce' } })
  : null;
