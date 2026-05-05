import { CODES } from '../constants/options'

/**
 * CodeBadge — severity badge.
 * Props:
 *  - code: 1..5
 *  - size: 'sm' | 'md' | 'lg'
 */
export default function CodeBadge({ code, size = 'md' }) {
  if (code == null) {
    const dim = size === 'lg' ? 'w-12 h-12 text-lg' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
    return (
      <div className={`${dim} rounded-md bg-ink-800 border border-ink-700 text-ink-500 inline-flex items-center justify-center font-display font-bold`}>
        —
      </div>
    )
  }
  const cfg = CODES.find((c) => c.code === code)
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
  }
  // For yellow/orange we want dark text; for green/blue/red, white.
  const textTone = code === 3 ? 'text-ink-950' : 'text-white'
  return (
    <div
      className={`${sizes[size]} ${cfg.tw} ${textTone} rounded-md inline-flex items-center justify-center font-display font-bold shadow-sm`}
      title={cfg.label + (cfg.desc ? ` (${cfg.desc})` : '')}
    >
      {code}
    </div>
  )
}
