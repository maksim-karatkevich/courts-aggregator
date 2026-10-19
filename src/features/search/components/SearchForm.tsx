'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { SearchParams } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { clampTo, fitWindow, minTo, timeOptions } from '../model/form-model'
import { DateField } from './DateField'
import { DateQuickPicks } from './DateQuickPicks'
import { DurationPicker } from './DurationPicker'
import { TimeSelect } from './TimeSelect'

interface Props {
  onSearch: (params: SearchParams) => void
  loading?: boolean
  initial?: SearchParams
}

const LAST_END = '23:00'

export function SearchForm({ onSearch, loading, initial }: Props) {
  const [date, setDate] = useState<Date | undefined>(initial ? parseISO(initial.date) : undefined)
  const [today, setToday] = useState<Date | undefined>(undefined)
  const [from, setFrom] = useState(initial?.from ?? '07:00')
  const [to, setTo] = useState(initial?.to ?? '23:00')
  const [forMinutes, setForMinutes] = useState(initial?.forMinutes ?? 60)
  const [halfHour, setHalfHour] = useState(false)

  // Set after mount to avoid a server/client date mismatch.
  useEffect(() => {
    const now = new Date()
    setToday(now)
    if (!initial) setDate(now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const step = halfHour ? 30 : 60
  const fromOptions = timeOptions(step, [from]).filter((t) => minTo(t, forMinutes) <= LAST_END)
  const toOptions = timeOptions(step, [to]).filter((t) => t >= minTo(from, forMinutes))

  function handleFrom(v: string) {
    setFrom(v)
    setTo(clampTo(to, v, forMinutes))
  }

  function handleDuration(m: number) {
    setForMinutes(m)
    const next = fitWindow(from, to, m, step)
    setFrom(next.from)
    setTo(next.to)
  }

  function handleSubmit() {
    if (!date) return
    onSearch({ date: format(date, 'yyyy-MM-dd'), from, to, forMinutes })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <DateField date={date} today={today} onChange={setDate} disabled={loading} />
        <DateQuickPicks date={date} now={today} onPick={setDate} disabled={loading} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <DurationPicker value={forMinutes} onChange={handleDuration} disabled={loading} />
        <TimeSelect label="Od" value={from} options={fromOptions} onChange={handleFrom} disabled={loading} />
        <TimeSelect label="Do" value={to} options={toOptions} onChange={setTo} disabled={loading} />
        <Button
          type="button"
          size="sm"
          variant={halfHour ? 'default' : 'outline'}
          aria-pressed={halfHour}
          disabled={loading}
          onClick={() => setHalfHour((v) => !v)}
        >
          Co 30 min
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Szukam…' : 'Szukaj'}
        </Button>
      </div>
    </div>
  )
}
