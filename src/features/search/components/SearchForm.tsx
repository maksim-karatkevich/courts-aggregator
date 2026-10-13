'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { SearchParams } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FormParams = Omit<SearchParams, 'forMinutes'>

interface Props {
  onSearch: (params: FormParams) => void
  loading?: boolean
}

function generateTimeSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = []
  for (let t = startHour * 60; t <= endHour * 60; t += 30) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots(6, 23)

export function SearchForm({ onSearch, loading }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [today, setToday] = useState<Date | undefined>(undefined)
  const [from, setFrom] = useState('07:00')
  const [to, setTo] = useState('23:00')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setDate(now)
  }, [])

  const MIN_DURATION_SLOTS = 2 // 2 × 30 min = 1 hour
  const fromIndex = TIME_SLOTS.indexOf(from)
  const toSlots = TIME_SLOTS.slice(fromIndex + MIN_DURATION_SLOTS)

  function handleFromChange(v: string) {
    setFrom(v)
    const newFromIndex = TIME_SLOTS.indexOf(v)
    const minTo = TIME_SLOTS[newFromIndex + MIN_DURATION_SLOTS]
    if (minTo && to < minTo) setTo(minTo)
  }

  function handleSubmit() {
    if (!date) return
    onSearch({ date: format(date, 'yyyy-MM-dd'), from, to })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Data</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={loading}
            className="flex h-8 w-40 items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarIcon className="size-4" />
            {date ? format(date, 'dd.MM.yyyy') : 'Wybierz datę'}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { setDate(d); setOpen(false) } }}
              disabled={today ? { before: today } : undefined}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Od</label>
        <Select value={from} onValueChange={(v) => { if (v) handleFromChange(v) }} disabled={loading}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.slice(0, -1).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Do</label>
        <Select value={to} onValueChange={(v) => { if (v) setTo(v) }} disabled={loading}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {toSlots.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Szukam…' : 'Szukaj'}
      </Button>
    </div>
  )
}
