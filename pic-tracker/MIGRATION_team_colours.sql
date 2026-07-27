-- ============================================================
-- PIC Tracker — Team colours migration
-- Adds two columns to the events table to store each team's chosen
-- colour (hex, e.g. '#14b8a6'). Run in the Supabase SQL editor BEFORE
-- (or alongside) deploying the team-colours code.
--
-- Safe to run:
--   * Idempotent — `if not exists` means running twice is fine.
--   * Backward-compatible — existing code ignores these columns.
--   * The colour write is also defensive on the client: if these
--     columns are missing, settings still save (colours just won't
--     sync until the columns exist).
--   * No RLS change needed — the writer's row-update policy covers them.
-- ============================================================

alter table public.events
  add column if not exists shift1_color text,
  add column if not exists shift2_color text;

-- (Optional) verify:
-- select id, name, shift1_color, shift2_color from public.events;
