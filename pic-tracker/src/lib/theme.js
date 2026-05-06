// lib/theme.js — light/dark theme + font size preferences.
//
// Theme:  'dark' | 'light' | 'system'  (system = follow OS preference)
// Size:   'small' | 'normal' | 'large'

const KEY_THEME = 'pic_theme'
const KEY_SIZE = 'pic_font_size'

const SIZE_PX = {
  small: '15px',
  normal: '17px',
  large: '20px',
}

function readKey(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function writeKey(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function getStoredTheme() {
  return readKey(KEY_THEME, 'system')
}

export function getStoredSize() {
  return readKey(KEY_SIZE, 'normal')
}

// Resolve 'system' to 'dark' or 'light' based on OS preference
export function resolveTheme(themePref) {
  if (themePref === 'dark' || themePref === 'light') return themePref
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return 'dark'
}

// Apply theme to the document. 'dark' removes the data attribute; 'light' sets it.
export function applyTheme(themePref) {
  const resolved = resolveTheme(themePref)
  const root = document.documentElement
  if (resolved === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
  // Also set a hint for color-scheme (form controls, scrollbars)
  root.style.colorScheme = resolved
}

export function applySize(sizePref) {
  const px = SIZE_PX[sizePref] || SIZE_PX.normal
  document.documentElement.style.setProperty('--base-font-size', px)
}

export function setTheme(themePref) {
  writeKey(KEY_THEME, themePref)
  applyTheme(themePref)
}

export function setSize(sizePref) {
  writeKey(KEY_SIZE, sizePref)
  applySize(sizePref)
}

// Listen for OS theme changes when user has 'system' preference.
// Returns an unsubscribe function.
export function watchSystemTheme(callback) {
  if (!window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => callback()
  if (mq.addEventListener) mq.addEventListener('change', handler)
  else mq.addListener(handler) // older browsers
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', handler)
    else mq.removeListener(handler)
  }
}

// Apply on first load — call once before React mounts to avoid FOUC
export function initTheme() {
  applyTheme(getStoredTheme())
  applySize(getStoredSize())
}
