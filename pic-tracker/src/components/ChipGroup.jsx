import { useState } from 'react'

/**
 * ChipGroup — reusable chip selector.
 * Props:
 *  - options: string[]
 *  - value: string | string[]   (depending on multi)
 *  - onChange: (value) => void
 *  - multi: bool
 *  - otherValue: string | null  (the free-text value when "Other" is selected)
 *  - onOtherChange: (text) => void
 */
export default function ChipGroup({
  options,
  value,
  onChange,
  multi = false,
  otherValue = '',
  onOtherChange,
  tone = 'neutral',
}) {
  const isOn = (opt) => (multi ? value?.includes(opt) : value === opt)

  const toggle = (opt) => {
    if (multi) {
      const next = isOn(opt) ? value.filter((v) => v !== opt) : [...(value || []), opt]
      onChange(next)
    } else {
      onChange(isOn(opt) ? null : opt)
    }
  }

  const otherSelected = multi ? value?.includes('Other') : value === 'Other'
  const onClass = tone === 'tint' ? 'chip-tint-on' : 'chip-on'
  const offClass = tone === 'tint' ? 'chip-tint-off' : 'chip-off'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={isOn(opt) ? onClass : offClass}
          >
            {opt}
          </button>
        ))}
      </div>
      {otherSelected && onOtherChange && (
        <input
          type="text"
          className="input"
          placeholder="Specify other…"
          value={otherValue || ''}
          onChange={(e) => onOtherChange(e.target.value)}
        />
      )}
    </div>
  )
}
