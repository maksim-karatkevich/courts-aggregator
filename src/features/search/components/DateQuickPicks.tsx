'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { quickPickDate, type QuickPick } from '../model/form-model'
import { memo } from 'react'

const PICKS: { kind: QuickPick; label: string }[] = [
  { kind: 'today', label: 'Dziś' },
  { kind: 'tomorrow', label: 'Jutro' },
  { kind: 'weekend', label: 'Weekend' },
]

interface Props {
  date: Date | undefined
  now: Date | undefined
  onPick: (d: Date) => void
  disabled?: boolean
}

export const DateQuickPicks = memo(function DateQuickPicks({ date, now, onPick, disabled }: Props) {
  return (
    <div className="flex gap-1.5">
      {PICKS.map(({ kind, label }) => {
        const target = now ? quickPickDate(kind, now) : undefined
        const pressed = !!date && !!target && format(date, 'yyyy-MM-dd') === format(target, 'yyyy-MM-dd')
        return (
          <Button
            key={kind}
            type="button"
            size="sm"
            variant={pressed ? 'default' : 'outline'}
            aria-pressed={pressed}
            disabled={disabled || !target}
            onClick={() => target && onPick(target)}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
})
