// lib/codeGen.js — 6-character alphanumeric codes with ambiguous chars excluded.
//
// No 0/O (confused with each other), no 1/I/L (confused with each other).
// 32-char alphabet, 6 chars => 32^6 = ~1.07 billion combos. Plenty of headroom
// for collision avoidance via DB unique constraint + retry.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 31 chars, no O/I/L/0/1

export function generateCode(length = 6) {
  let out = ''
  // Use crypto for non-predictable codes (matters more for writer than viewer).
  const buf = new Uint32Array(length)
  crypto.getRandomValues(buf)
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length]
  }
  return out
}

export function isValidCodeFormat(code) {
  if (typeof code !== 'string') return false
  const upper = code.toUpperCase()
  if (upper.length < 4 || upper.length > 10) return false
  for (const ch of upper) {
    if (!ALPHABET.includes(ch)) return false
  }
  return true
}

export function normalizeCode(code) {
  return (code || '').toUpperCase().trim()
}
