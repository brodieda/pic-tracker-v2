import { useEffect, useState } from 'react'
import {
  getStoredTheme,
  setTheme,
  resolveTheme,
  watchSystemTheme,
} from '../lib/theme'

const NEXT = { dark: 'light', light: 'system', system: 'dark' }

const ICONS = {
  dark: '☾',     // moon
  light: '☀',    // sun
  system: '◐',   // half-circle (auto)
}

const LABELS = {
  dark: 'Dark',
  light: 'Light',
  system: 'Auto',
}

export default function ThemeToggle() {
  const [theme, setThemeLocal] = useState(getStoredTheme())
  const [, setTick] = useState(0) // forces re-render on system theme changes

  useEffect(() => {
    if (theme !== 'system') return
    return watchSystemTheme(() => setTick((t) => t + 1))
  }, [theme])

  const onClick = () => {
    const next = NEXT[theme]
    setTheme(next)
    setThemeLocal(next)
  }

  const resolved = resolveTheme(theme)

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-display font-semibold tracking-wide text-ink-300 hover:text-ink-100 hover:bg-ink-800 transition"
      title={`Theme: ${LABELS[theme]}${theme === 'system' ? ` (auto: ${LABELS[resolved]})` : ''} — click to cycle`}
      aria-label={`Theme: ${LABELS[theme]}`}
    >
      <span className="text-base leading-none">{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  )
}
