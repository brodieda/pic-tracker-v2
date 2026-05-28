[README.md](https://github.com/user-attachments/files/28327527/README.md)
# PIC Tracker — Phase 5b: Auth rewrite + Intake-only + End Event

This bundle replaces the custom-header RLS approach with Supabase Anonymous Sign-ins (the proper, supported pattern). Adds intake-only role and end-event functionality.

## Apply in this order

### 1. Run the SQL migration FIRST

Open Supabase SQL Editor and run `supabase-v2/03-migration.sql` as a single block.

This migration:
- Adds `admit_code` column to events
- Adds `source` column to pics
- Drops the old custom-header functions and policies
- Creates new JWT-claim-based policies
- Adds RPC functions: `create_event_with_codes`, `set_session_event_metadata`, `join_event_by_code`, `next_pic_number_for_event`
- Re-enables RLS

After running, verify in the SQL Editor:
```sql
select policyname from pg_policies where schemaname = 'public' order by policyname;
```
You should see ~10 policies across the three tables.

### 2. Enable Anonymous Sign-ins in Supabase Dashboard

Critical step — this is OFF by default.

In Supabase Dashboard:
1. **Authentication** → **Providers**
2. Find **Anonymous Sign-ins** in the list
3. Toggle it **ON**
4. Save

Without this toggle, the auth flow fails silently.

### 3. Replace the frontend files

11 files in this bundle:

Modified:
- `src/App.jsx`
- `src/components/CareBoard.jsx` (unchanged from v1 but re-bundled for safety)
- `src/components/CodesBadge.jsx` (3 codes + end-event button)
- `src/components/IntakeModal.jsx` (writes `source: 'writer'`)
- `src/components/LandingScreen.jsx` (new auth flow)
- `src/components/PicCard.jsx` (INTAKE indicator for remote-admitted PICs)
- `src/lib/supabaseClient.js` (simplified — one global client)
- `src/lib/supabaseStore.js` (JWT-based, RPC functions)
- `src/lib/eventSession.js` (clearSession is now async, integrates Supabase auth)
- `src/lib/syncEngine.js` (carries `source` field)

New:
- `src/components/IntakeOnlyScreen.jsx` (mobile-first form for rovers)

Drop them into your repo at matching paths. Then:

```
npm install
npm run build
```

Build clean: 242.9 kB main bundle.

### 4. Deploy

Vercel auto-builds. No new env vars — uses the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## How the new auth model works

1. User enters code on landing screen
2. App calls `supabase.auth.signInAnonymously()` → gets a JWT
3. App calls `set_session_event_metadata(code)` RPC → server verifies code, binds event_id + role to user's app_metadata
4. App calls `refreshSession()` → new JWT contains the metadata
5. RLS policies read the JWT claims → enforce role-based access

All RLS checks read from `auth.jwt()->'app_metadata'->>'event_id'` and similar. Standard Supabase pattern.

## What changed for users

**Same:**
- Landing screen (create / join)
- Codes are still 6-character alphanumeric
- Writers see board, viewers see read-only, codes badge in header

**New:**
- Three codes per event (writer, viewer, intake), all visible in writer's codes badge
- Intake code lands users on a single-page mobile form (no board, no nav)
- After intake submission, 5-min note window for en-route updates
- PICs admitted via intake show an amber "INTAKE" badge on the board
- "End event" button in codes badge — exports XLSX first, then sets `is_active = false`, locks everyone out
- Old events stay in Supabase; can be reopened by setting `is_active = true` in Table Editor

## Testing checklist

1. **Migration:** SQL runs without errors, ~10 policies appear in pg_policies
2. **Anon sign-ins toggle:** ON in Supabase auth settings
3. **Create event:** Landing → Start a new event → name → see writer code in header
4. **Codes badge:** Click → see all 3 codes — writer, viewer, intake
5. **Writer admit:** Admit a PIC → appears in board, no INTAKE badge, mirrors to Supabase
6. **Second device as viewer:** Join with viewer code → see PICs, "Read only" pill, no New PIC button
7. **Third device as intake:** Join with intake code → see only the intake form, no nav
8. **Intake admit:** Submit a PIC → confirmation with #, Add Note button visible
9. **Add note:** Type note, submit → "Note added" confirmation
10. **Back to writer device:** see new PIC in board with amber INTAKE badge
11. **End event:** Writer codes badge → End event → XLSX downloads → all devices kicked next sync
12. **Try rejoining with old code:** Should fail with "No active event found"

## Known limitations / what's NOT in this bundle

1. **PicDetailPanel still shows write buttons to viewers** — they don't do anything (RLS rejects) but UX is confusing. Future polish.
2. **End event can't be undone from the UI** — coordinator goes to Supabase Table Editor and sets is_active = true manually
3. **Intake-only "Other" options skipped** — to keep the form fast. Free-text Other can be added if needed
4. **Intake-only doesn't see PIC numbers above #1 if database lookup fails** — RPC has its own logic, but if Supabase has a glitch the user sees an error rather than retry

## Rollback plan

If the migration breaks anything, revert by:

```sql
alter table public.events disable row level security;
alter table public.pics disable row level security;
alter table public.activity_log disable row level security;
```

The data is preserved — only access policies are disabled.

## Cleanup of test data

Before going live, in SQL Editor:

```sql
-- See what's there
select id, name, writer_code, is_active, created_at from public.events order by created_at desc;

-- Wipe all test events (CASCADEs to pics + activity_log)
delete from public.events;
```
