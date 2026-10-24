// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Calendar } from '@/components/ui/calendar'

afterEach(cleanup)

describe('Calendar keyboard', () => {
  it('ArrowRight moves focus to the next day', () => {
    const day = new Date(2026, 9, 24)
    render(<Calendar mode="single" selected={day} defaultMonth={day} onSelect={() => {}} />)
    const selected = document.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')!
    act(() => selected.focus())

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' })

    expect(document.activeElement?.textContent).toBe('25')
  })
})
