import type { SearchWindow } from '@/lib/types'

export function CalendarLegend({ window }: { window: SearchWindow | null }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-green-500" aria-hidden />
        <span>wolny</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm bg-muted" aria-hidden />
        <span>zajęty</span>
      </li>
      {window && (
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-blue-100 ring-1 ring-blue-400" aria-hidden />
          <span>{`Twoje okno ${window.from} – ${window.to}`}</span>
        </li>
      )}
    </ul>
  )
}
