# Security Monitored flag — change bundle

This bundle adds the Security Monitored (ejection pathway) flag to PIC Tracker. It's a parallel feature to the existing Code 2 MH flag.

## Files modified (11)

### Library
- `src/lib/helpers.js` — `dischargePic` now persists `securityNotified`; new `setEjectionFlag` helper that emits `flag_change` events
- `src/lib/xlsxExport.js` — two new columns: `Security monitored`, `Security notified at discharge`
- `src/lib/stats.js` — new `ejectionFlaggedCount` and `securityNotificationBreakdown`, wired into `computeAllStats` as `stats.security`
- `src/lib/completeness.js` — flagged discharged PICs without `securityNotified` now flagged as incomplete

### Components
- `src/components/IntakeModal.jsx` — Security Monitored checkbox after Presentations; sets `ejectionFlag` on new PICs
- `src/components/DischargeModal.jsx` — reminder banner at top for flagged PICs; Yes/No "Security/RSA notified?" field (only when flagged); soft-warning dialog when "No" is selected
- `src/components/PicCard.jsx` — `⚑ SEC` badge next to existing MH badge; post-discharge notification status pill
- `src/components/PicDetailPanel.jsx` — persistent banner at top of body; "Flag as Security Monitored" button above Discharge for in-care PICs; "clear flag" link in banner
- `src/components/CareBoard.jsx` — `⚑` glyph on discharged-list rows, coloured by notification state
- `src/components/EventLog.jsx` — renders `flag_change` events with summary line
- `src/components/Reports.jsx` — new Security Monitored stat tile next to Medical involved

## Data model additions

On each PIC record:
- `ejectionFlag: boolean` — set at intake, toggleable mid-care
- `securityNotified: boolean | null` — null = N/A or not yet answered; set at discharge for flagged PICs only

New event type in the log:
- `flag_change` — `meta: { flag: 'ejection', value: true | false }`

The discharge event's `meta` now also includes `securityNotified`.

## Backwards compatibility

Older PIC records (pre-flag) will have `ejectionFlag === undefined`. Every check uses truthy comparison (`!!pic.ejectionFlag` or `pic.ejectionFlag === true`), so legacy records behave as if unflagged. No data migration needed. JSON import will also work — missing fields default to falsy.

## How to apply

Replace these 11 files in your repo with the versions in this bundle (same paths). Then:
```
npm install   # only needed if not already done
npm run build # verify clean build
```

A unified diff (`security-monitored.patch`) is included for review.

## Verified

Final `vite build` clean: 240.69 kB JS bundle (was 239.43 kB before), 34.57 kB CSS unchanged. No new dependencies.

## Visual design notes

The flag uses a near-white slate badge (`bg-slate-100`) — chosen deliberately to be visually distinct from severity codes (which own red/orange/yellow/blue/green) and the MH flag (orange). If the contrast is too stark in the light theme, swap `bg-slate-100` for `bg-ink-100` in PicCard.jsx, PicDetailPanel.jsx, DischargeModal.jsx, and IntakeModal.jsx — `ink-100` respects the light/dark theme variable.

## Test checklist

1. Flag at intake → discharge → answer "Yes" → no warning, recorded
2. Flag at intake → discharge → answer "No" → soft warning → cancel returns to modal
3. Flag at intake → discharge → answer "No" → soft warning → confirm proceeds
4. No flag at intake → discharge → no security question appears
5. No flag at intake → use "Flag as Security Monitored" button mid-care → SEC badge appears
6. Flagged in-care → "clear flag" in banner → flag removed, event logged
7. Reports view shows new Security Monitored tile with notification breakdown
8. XLSX export contains both new columns
9. Import older JSON (no ejectionFlag field) → loads cleanly, behaves as unflagged

TEST
