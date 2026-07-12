import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

/**
 * Anon client — for public reads (no RLS bypass).
 * Use for: landing page data, public settings, etc.
 */
export function getSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * User-scoped client — enforces RLS via the user's JWT.
 * Use for: profile reads/writes, formations, referrals, etc.
 * The user's token is passed in the Authorization header.
 */
export function getSupabaseForUser(accessToken) {
  if (!accessToken) return getSupabase();
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Admin client — bypasses ALL RLS.
 * Use ONLY for: admin dashboard, user creation, banned user checks,
 * operations that must touch multiple tables atomically.
 */
export function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
