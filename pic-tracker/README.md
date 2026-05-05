# PIC Tracker — Phase 1

LocalStorage-only React + Vite + Tailwind app for festival carespace PIC intake.

## Phase 1 scope

- ✅ Event settings (name, shift 1 + shift 2 rosters, code 3 check interval)
- ✅ New PIC intake modal (name, code, referred by, substances, presentations, intake KPE, optional gender/age/description/note)
- ✅ Care board (in-care + discharged columns, sorted by severity then time)
- ⏳ Detail screen, discharge flow, code 3 monitoring, reporting, exports — Phase 2+

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Data shape (localStorage keys)

- `pic_event` — single event config object
- `pic_pics` — array of PIC records
- `pic_events` — append-only audit log

See `src/lib/store.js` for the full API.

## First-run

On first launch with no event name and no PICs, the app routes you to Settings. Set the event name and rosters, save, then switch to Board to start admitting.

## Notes

- All data stays in your browser. No network calls.
- Use a JSON export tool (Phase 2) to back up between sessions or move between devices.
- localStorage cap is ~5MB per origin — easily enough for hundreds of PICs.

## Code conventions

- Severity codes: 1 = lowest, 5 = highest. Colours: 1 green, 2 blue, 3 yellow, 4 orange, 5 red.
- Shift 1 = teal pill, Shift 2 = purple pill.
- Time stored as local ISO strings (no timezone). Device clock authority.
