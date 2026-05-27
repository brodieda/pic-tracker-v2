// lib/supabaseClient.js — Supabase client setup
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the Vite environment.
// If either is missing, exports a `null` client so the rest of the app can detect
// "no Supabase configured" and skip the dual-write cleanly (no crashes during local
// dev where env vars aren't set).
//
// The client is created lazily on first import and re-used. Per-request headers
// for the event codes are applied via `withCodes()` below — every store call
// goes through that wrapper so RLS policies see the right credentials.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_CONFIGURED = !!(url && anonKey)

export const supabase = SUPABASE_CONFIGURED
  ? createClient(url, anonKey, {
      auth: {
        // We're not using Supabase Auth — codes go through custom headers.
        // Disable session persistence so we don't get bogus anon JWTs in localStorage.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    })
  : null

// Returns a Supabase client with the given event codes injected as headers.
// RLS policies read these headers via current_setting('request.headers').
//
// Usage:
//   const sb = withCodes({ writerCode: 'LP2A7K' })
//   const { data } = await sb.from('pics').select('*')
//
// Pass either writerCode (full access) or viewerCode (read-only) or both.
// Returns null if Supabase isn't configured.
export function withCodes({ writerCode, viewerCode } = {}) {
  if (!supabase) return null
  const headers = {}
  if (writerCode) headers['x-event-writer-code'] = writerCode
  if (viewerCode) headers['x-event-viewer-code'] = viewerCode

  // Supabase JS v2: per-call headers via the .from().headers() API isn't a thing,
  // but we can re-create a thin client wrapper. Easier: build a new client with
  // global headers. This is cheap (no new connection) and standard.
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 5 } },
    global: { headers },
  })
}
