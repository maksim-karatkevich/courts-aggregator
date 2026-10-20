'use client'

import { useState, memo } from 'react'
import { format } from 'date-fns'
import { pl } from 'react-day-picker/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  date: Date | undefined
  today: Date | undefined
  onChange: (d: Date) => void
  disabled?: boolean
}

export const DateField = memo(function DateField({ date, today, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">Data</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className="flex h-8 w-40 items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="size-4" />
          {date ? format(date, 'dd.MM.yyyy') : 'Wybierz datę'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={pl}
            selected={date}
            onSelect={(d) => { if (d) { onChange(d); setOpen(false) } }}
            disabled={today ? { before: today } : undefined}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
})
