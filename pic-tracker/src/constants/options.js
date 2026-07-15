// constants/options.js — stock chip lists. "Other" with free-text covers the long tail.

export const REFERRED_BY = ['Self', 'Friend', 'Security', 'Medical', 'Police', 'Rovers', 'Other']

// Per-option colours for referred-by chips, so each source reads as a distinct
// colour at a glance rather than one flat tint. Kept off the code/shift hues
// (red/orange/yellow/blue/green, teal/purple) so nothing is confused with
// severity codes or shift pills.
export const REFERRED_BY_COLORS = {
  Self: {
    off: 'bg-sky-500/10 text-sky-300 border-sky-500/25 hover:border-sky-400/50',
    on: 'bg-sky-500 text-white border-sky-500',
  },
  Friend: {
    off: 'bg-violet-500/10 text-violet-300 border-violet-500/25 hover:border-violet-400/50',
    on: 'bg-violet-500 text-white border-violet-500',
  },
  Security: {
    off: 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:border-amber-400/50',
    on: 'bg-amber-500 text-white border-amber-500',
  },
  Medical: {
    off: 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:border-rose-400/50',
    on: 'bg-rose-500 text-white border-rose-500',
  },
  Police: {
    off: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25 hover:border-indigo-400/50',
    on: 'bg-indigo-500 text-white border-indigo-500',
  },
  Rovers: {
    off: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:border-emerald-400/50',
    on: 'bg-emerald-500 text-white border-emerald-500',
  },
  Other: {
    off: 'chip-off',
    on: 'chip-on',
  },
}

export const REFERRED_TO = ['Self', 'Friends', 'Medical', 'Security', 'Police', 'Other']

// Static (read-only) tinted tag classes for referral chips shown on board cards.
// Muted tint variants of the intake colours so the board stays calm while still
// making the referral source/destination scannable. Keyed by canonical label;
// 'Friends' (referred-to) shares the 'Friend' colour. Unknowns / free-text /
// 'Other' fall back to the plain grey .tag (empty string = no colour override).
export const REFERRAL_TAG_COLORS = {
  Self: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  Friend: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  Friends: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  Security: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  Medical: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  Police: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  Rovers: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
}

export function referralTagClass(label) {
  return REFERRAL_TAG_COLORS[label] || ''
}

// Editable-chip colour map for referred-to (discharge modal + detail panel),
// mirroring REFERRED_BY_COLORS so the Ref-to concept is coloured consistently
// with Ref-by. 'Friends' here shares the 'Friend' hue from referred-by.
export const REFERRED_TO_COLORS = {
  Self: {
    off: 'bg-sky-500/10 text-sky-300 border-sky-500/25 hover:border-sky-400/50',
    on: 'bg-sky-500 text-white border-sky-500',
  },
  Friends: {
    off: 'bg-violet-500/10 text-violet-300 border-violet-500/25 hover:border-violet-400/50',
    on: 'bg-violet-500 text-white border-violet-500',
  },
  Medical: {
    off: 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:border-rose-400/50',
    on: 'bg-rose-500 text-white border-rose-500',
  },
  Security: {
    off: 'bg-amber-500/10 text-amber-300 border-amber-500/25 hover:border-amber-400/50',
    on: 'bg-amber-500 text-white border-amber-500',
  },
  Police: {
    off: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25 hover:border-indigo-400/50',
    on: 'bg-indigo-500 text-white border-indigo-500',
  },
  Other: {
    off: 'chip-off',
    on: 'chip-on',
  },
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
