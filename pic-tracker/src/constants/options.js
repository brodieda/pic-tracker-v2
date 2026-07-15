// constants/options.js — stock chip lists. "Other" with free-text covers the long tail.

export const REFERRED_BY = ['Self', 'Friend', 'Security', 'Medical', 'Police', 'Rovers', 'Other']

// Per-option colours for referred-by chips, so each source reads as a distinct
// colour at a glance rather than one flat tint. Kept off the code/shift hues
// (red/orange/yellow/blue/green, teal/purple) so nothing is confused with
// severity codes or shift pills.
export const REFERRED_BY_COLORS = {
  Self: { off: 'ref-off-sky', on: 'ref-on-sky' },
  Friend: { off: 'ref-off-violet', on: 'ref-on-violet' },
  Security: { off: 'ref-off-amber', on: 'ref-on-amber' },
  Medical: { off: 'ref-off-rose', on: 'ref-on-rose' },
  Police: { off: 'ref-off-indigo', on: 'ref-on-indigo' },
  Rovers: { off: 'ref-off-emerald', on: 'ref-on-emerald' },
  Other: { off: 'chip-off', on: 'chip-on' },
}

export const REFERRED_TO = ['Self', 'Friends', 'Medical', 'Security', 'Police', 'Other']

// Static (read-only) tinted tag classes for referral chips shown on board cards.
// Muted tint variants of the intake colours so the board stays calm while still
// making the referral source/destination scannable. Keyed by canonical label;
// 'Friends' (referred-to) shares the 'Friend' colour. Unknowns / free-text /
// 'Other' fall back to the plain grey .tag (empty string = no colour override).
export const REFERRAL_TAG_COLORS = {
  Self: 'reftag-sky',
  Friend: 'reftag-violet',
  Friends: 'reftag-violet',
  Security: 'reftag-amber',
  Medical: 'reftag-rose',
  Police: 'reftag-indigo',
  Rovers: 'reftag-emerald',
}

export function referralTagClass(label) {
  return REFERRAL_TAG_COLORS[label] || ''
}

// Editable-chip colour map for referred-to (discharge modal + detail panel),
// mirroring REFERRED_BY_COLORS so the Ref-to concept is coloured consistently
// with Ref-by. 'Friends' here shares the 'Friend' hue from referred-by.
export const REFERRED_TO_COLORS = {
  Self: { off: 'ref-off-sky', on: 'ref-on-sky' },
  Friends: { off: 'ref-off-violet', on: 'ref-on-violet' },
  Medical: { off: 'ref-off-rose', on: 'ref-on-rose' },
  Security: { off: 'ref-off-amber', on: 'ref-on-amber' },
  Police: { off: 'ref-off-indigo', on: 'ref-on-indigo' },
  Other: { off: 'chip-off', on: 'chip-on' },
}


export const SUBSTANCES = [
  'Alcohol',
  'MDMA',
  'LSD',
  'Ketamine',
  'Cocaine',
  'GHB',
  'Cannabis',
  'Mushrooms',
  'Amphetamines',
  'Unknown',
  'None',
  'Other',
]

export const PRESENTATIONS = [
  'Cold',
  'Overheated',
  'Anxiety',
  'Mental health',
  'Physical injury',
  'Dehydration',
  'Vomiting',
  'Confusion',
  'Lost / separated',
  'Sleep / rest',
  'Other',
]

export const GENDERS = ['Feminine', 'Masculine', 'Non-binary']

export const AGE_RANGES = ['<15', '15-19', '20-24', '25-29', '30-34', '35-39', '40+']

export const OUTCOMES = [
  'Back to camp',
  'Ejected',
  'Left event',
  'Medical',
  'Return to party',
  'Other',
]

export const CODES = [
  { code: 1, label: 'Code 1', desc: 'Emergency', tw: 'bg-code-1', emergency: true },
  { code: 2, label: 'Code 2', desc: 'MH', tw: 'bg-code-2' },
  { code: 3, label: 'Code 3', desc: 'Moderate', tw: 'bg-code-3' },
  { code: 4, label: 'Code 4', desc: 'Mild', tw: 'bg-code-4' },
  { code: 5, label: 'Code 5', desc: 'Nothing', tw: 'bg-code-5' },
]

// ============================================================
// Category colours for substances / presentations / gender / age.
//
// These are SUPER pale washes (lighter than the referral chips) that
// group options by category so the picker is scannable at a glance.
// The category hue is shown even when a chip is unselected; selection
// firms it up (see .cat-off-* / .cat-on-* in index.css). Neutral
// options (Unknown / None / Other) stay plain grey.
//
// Substances grouped by drug class; presentations by presentation type.
// Gender / age carry no per-option meaning, so they use a single soft
// neutral highlight on selection only (plain when unselected).
// ============================================================

// NOTE: class names must be written as complete literal strings (not built
// dynamically) so Tailwind's content scanner keeps them and doesn't purge them.
const PLAIN = { off: 'chip-off', on: 'chip-on' }
const SOFT = { off: 'chip-off', on: 'cat-on-slate' }

// Substances → drug class
export const SUBSTANCE_COLORS = {
  MDMA: { off: 'cat-off-rose', on: 'cat-on-rose' },
  Cocaine: { off: 'cat-off-rose', on: 'cat-on-rose' },
  Amphetamines: { off: 'cat-off-rose', on: 'cat-on-rose' },
  Alcohol: { off: 'cat-off-indigo', on: 'cat-on-indigo' },
  GHB: { off: 'cat-off-indigo', on: 'cat-on-indigo' },
  LSD: { off: 'cat-off-fuchsia', on: 'cat-on-fuchsia' },
  Mushrooms: { off: 'cat-off-fuchsia', on: 'cat-on-fuchsia' },
  Ketamine: { off: 'cat-off-cyan', on: 'cat-on-cyan' },
  Cannabis: { off: 'cat-off-emerald', on: 'cat-on-emerald' },
  Unknown: PLAIN,
  None: PLAIN,
  Other: PLAIN,
}

// Presentations → type
export const PRESENTATION_COLORS = {
  Cold: { off: 'cat-off-cyan', on: 'cat-on-cyan' },
  Overheated: { off: 'cat-off-cyan', on: 'cat-on-cyan' },
  Anxiety: { off: 'cat-off-violet', on: 'cat-on-violet' },
  'Mental health': { off: 'cat-off-violet', on: 'cat-on-violet' },
  Confusion: { off: 'cat-off-violet', on: 'cat-on-violet' },
  'Physical injury': { off: 'cat-off-rose', on: 'cat-on-rose' },
  Dehydration: { off: 'cat-off-rose', on: 'cat-on-rose' },
  Vomiting: { off: 'cat-off-rose', on: 'cat-on-rose' },
  'Lost / separated': { off: 'cat-off-amber', on: 'cat-on-amber' },
  'Sleep / rest': { off: 'cat-off-amber', on: 'cat-on-amber' },
  Other: PLAIN,
}

// Gender / age → soft neutral highlight on selection only
export const GENDER_COLORS = Object.fromEntries(GENDERS.map((g) => [g, SOFT]))
export const AGE_COLORS = Object.fromEntries(AGE_RANGES.map((a) => [a, SOFT]))
