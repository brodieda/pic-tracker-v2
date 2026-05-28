// lib/supabaseClient.js — single Supabase client used everywhere.
//
// Auth model: Supabase Anonymous Sign-ins.
// Each device signs in once on join, gets a JWT, and that JWT
// carries the event_id + role claims that RLS checks.
//
// No more custom headers. No more per-request client creation.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_CONFIGURED = !!(url && anonKey)

export const supabase = SUPABASE_CONFIGURED
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'pic_supabase_auth',
      },
    })
  : null
