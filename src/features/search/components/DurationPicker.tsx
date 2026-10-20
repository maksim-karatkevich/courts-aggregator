'use client'

import { Button } from '@/components/ui/button'
import { DURATIONS } from '@/lib/types'
import { memo } from 'react'

interface Props {
  value: number
  onChange: (minutes: number) => void
  disabled?: boolean
}

export const DurationPicker = memo(function DurationPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id="duration-label" className="text-sm font-medium">Czas gry</span>
      <div role="group" aria-labelledby="duration-label" className="flex gap-1.5">
        {DURATIONS.map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={d === value ? 'default' : 'outline'}
            aria-pressed={d === value}
            disabled={disabled}
            onClick={() => onChange(d)}
          >
            {d} min
          </Button>
        ))}
      </div>
    </div>
  )
})
