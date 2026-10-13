'use client';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** One row of the `unity_rough` module. */
export interface UnityRoughRow {
  session_id: string;
  camera_granted: boolean | null;
  microphone_granted: boolean | null;
  location_granted: boolean | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  user_agent: string | null;
}

/**
 * Insert a permission/location record into Supabase.
 *
 * We POST straight to PostgREST with `fetch` instead of using `@supabase/supabase-js`:
 *  - it avoids the SDK's realtime/WebSocket requirement (Node 22+) during SSR, and
 *  - it lets us send ONLY the `apikey` header. The new publishable keys
 *    (`sb_publishable_…`) are not JWTs, so sending them as `Authorization: Bearer`
 *    makes PostgREST reject the anon role (RLS 42501). apikey-only resolves to the
 *    `anon` role, which the "unity_rough anon insert" policy allows.
 *
 * Never throws — any failure is logged and swallowed so it can't break the journey.
 */
export async function saveUnityRough(row: UnityRoughRow): Promise<void> {
  if (!url || !anonKey) {
    console.info('[unity_rough] Supabase not configured — skipping insert.', row);
    return;
  }
  try {
    const res = await fetch(`${url}/rest/v1/unity_rough`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.warn('[unity_rough] insert failed:', res.status, await res.text());
    }
  } catch (err) {
    console.warn('[unity_rough] insert threw:', err);
  }
}
