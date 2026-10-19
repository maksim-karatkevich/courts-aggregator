import { addDays } from 'date-fns'

export type QuickPick = 'today' | 'tomorrow' | 'weekend'

const DAY_START = 6 * 60
const DAY_END = 23 * 60

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(total: number): string {
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function quickPickDate(kind: QuickPick, now: Date): Date {
  if (kind === 'today') return now
  if (kind === 'tomorrow') return addDays(now, 1)
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return now
  return addDays(now, 6 - day)
}

/** 06:00–23:00 in the given step; `keep` values (e.g. a current non-grid selection) are merged in, sorted. */
export function timeOptions(step: 30 | 60, keep: string[] = []): string[] {
  const set = new Set<string>(keep)
  for (let t = DAY_START; t <= DAY_END; t += step) set.add(fromMinutes(t))
  return [...set].sort()
}

export function minTo(from: string, forMinutes: number): string {
  return fromMinutes(toMinutes(from) + forMinutes)
}

export function clampTo(to: string, from: string, forMinutes: number): string {
  const min = minTo(from, forMinutes)
  return to < min ? min : to
}

/** Fit a window after the duration grows: pull `from` back so the game ends by 23:00 (snapped down to the step grid), then clamp `to`. */
export function fitWindow(
  from: string,
  to: string,
  forMinutes: number,
  step: 30 | 60,
): { from: string; to: string } {
  const latest = DAY_END - forMinutes
  let nextFrom = from
  if (toMinutes(from) > latest) {
    const snapped = DAY_START + Math.floor((latest - DAY_START) / step) * step
    nextFrom = fromMinutes(snapped)
  }
  return { from: nextFrom, to: clampTo(to, nextFrom, forMinutes) }
}
