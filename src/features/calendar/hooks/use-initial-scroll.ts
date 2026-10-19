'use client'

import { useLayoutEffect, type RefObject } from 'react'

// Scrolls the grid so the row for `firstHour` sits just under the sticky court header.
export function useInitialScroll(
  containerRef: RefObject<HTMLElement | null>,
  firstHour: number,
  resetKey: string
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const row = container.querySelector<HTMLElement>(`[data-hour="${firstHour}"]`)
    const header = container.querySelector<HTMLElement>('[data-grid-header]')
    if (!row) return
    container.scrollTop = row.offsetTop - (header?.offsetHeight ?? 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])
}
