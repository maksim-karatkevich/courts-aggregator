// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SearchForm } from '@/features/search/components/SearchForm'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SearchForm', () => {
  it('Jutro chip emits tomorrow with defaults', () => {
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jutro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(onSearch).toHaveBeenCalledWith({ date: '2026-10-22', from: '07:00', to: '23:00', forMinutes: 120 })
  })

  it('duration button changes forMinutes', () => {
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} />)
    fireEvent.click(screen.getByRole('button', { name: '90 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ forMinutes: 90 }))
  })

  it('emits initial values', () => {
    const onSearch = vi.fn()
    const initial = { date: '2026-11-02', from: '18:00', to: '21:00', forMinutes: 120 }
    render(<SearchForm onSearch={onSearch} initial={initial} />)
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(onSearch).toHaveBeenCalledWith(initial)
  })

  it('marks the active duration with aria-pressed', () => {
    render(<SearchForm onSearch={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Czas gry' })
    const buttons = Array.from(group.querySelectorAll('button'))
    expect(buttons.map((b) => b.textContent)).toEqual(['120 min', '90 min', '60 min'])
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
    fireEvent.click(buttons[2])
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true'])
  })

  it('keeps a late window valid when the duration grows', () => {
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} initial={{ date: '2026-11-02', from: '22:00', to: '23:00', forMinutes: 60 }} />)
    fireEvent.click(screen.getByRole('button', { name: '120 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(onSearch).toHaveBeenCalledWith({ date: '2026-11-02', from: '21:00', to: '23:00', forMinutes: 120 })
  })

  it('keeps a half-hour initial value selectable while hourly', () => {
    const onSearch = vi.fn()
    render(<SearchForm onSearch={onSearch} initial={{ date: '2026-11-02', from: '13:30', to: '16:00', forMinutes: 60 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ from: '13:30', to: '16:00' }))
  })
})
