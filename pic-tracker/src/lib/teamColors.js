// Curated team-colour palette. Chosen to stay clear of the code colours
// (red/orange/yellow/blue/green) so a team chip can't be mistaken for a
// severity code. Values are hex; stored on the event as hex.
export const TEAM_PALETTE = [
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#d946ef', name: 'Fuchsia' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#64748b', name: 'Slate' },
]

// Defaults (match the original teal / purple), as "R G B" triplets.
export const DEFAULT_SHIFT_1 = '20 184 166' // teal
export const DEFAULT_SHIFT_2 = '168 85 247' // purple

// "#14b8a6" -> "20 184 166" (space-separated, for the CSS variable). null on bad input.
export function hexToTriplet(hex) {
  if (typeof hex !== 'string') return null
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const int = parseInt(m[1], 16)
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`
}

// Push the event's team colours into the CSS variables that Tailwind's
// `shift-1` / `shift-2` colours reference. Falls back to the defaults.
export function applyTeamColors(event) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--shift-1', hexToTriplet(event?.shift1Color) || DEFAULT_SHIFT_1)
  root.style.setProperty('--shift-2', hexToTriplet(event?.shift2Color) || DEFAULT_SHIFT_2)
}
