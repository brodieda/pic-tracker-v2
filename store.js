// constants/options.js — stock chip lists. "Other" with free-text covers the long tail.

export const REFERRED_BY = ['Self', 'Friend', 'Security', 'Medical', 'Police', 'Roaming team', 'Other']

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

export const AGE_RANGES = ['Under 18', '18-19', '20-24', '25-29', '30-34', '35-44', '45+']

export const OUTCOMES = [
  'Return to party',
  'Sent home with friends',
  'Sent home alone',
  'Transferred to medical',
  'Self-discharged',
  'Created in error',
  'Other',
]

export const CODES = [
  { code: 1, label: 'Code 1', desc: 'Emergency', tw: 'bg-code-1', emergency: true },
  { code: 2, label: 'Code 2', desc: 'High', tw: 'bg-code-2' },
  { code: 3, label: 'Code 3', desc: '', tw: 'bg-code-3' },
  { code: 4, label: 'Code 4', desc: '', tw: 'bg-code-4' },
  { code: 5, label: 'Code 5', desc: 'Low', tw: 'bg-code-5' },
]
