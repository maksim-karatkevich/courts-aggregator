'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { memo, useId } from 'react'

interface Props {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
}

export const TimeSelect = memo(function TimeSelect({ label, value, options, onChange, disabled }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      {/* Trigger is named "<label> <value>" via aria-labelledby, like DateField. */}
      <span id={`${id}-label`} className="text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v) }} disabled={disabled}>
        <SelectTrigger id={`${id}-trigger`} aria-labelledby={`${id}-label ${id}-trigger`} className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})
