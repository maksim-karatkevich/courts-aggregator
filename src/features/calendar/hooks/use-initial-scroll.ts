'use client'

import { useLayoutEffect, type RefObject } from 'react'
import { scrollTopFor } from '../model/scroll-top'

// Scrolls the grid so the row for `firstHour` sits just under the sticky court header.
export function useInitialScroll(
  containerRef: RefObject<HTMLElement | null>,
  firstHour: number,
  resetKey: string
): void {
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const label = container.querySelector<HTMLElement>(`[data-hour="${firstHour}"]`)
    const header = container.querySelector<HTMLElement>('[data-grid-header]')
    if (!label) return
    container.scrollTop = scrollTopFor(
      label.getBoundingClientRect().top,
      container.getBoundingClientRect().top,
      container.scrollTop,
      header?.offsetHeight ?? 0
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])
}
