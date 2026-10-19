// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Platform, type ClubResult } from '@/lib/types'

vi.mock('@/features/account/components/StarButton', () => ({
  StarButton: () => <button type="button">star</button>,
}))

import { ClubCard } from '@/features/club/components/ClubCard'

afterEach(cleanup)

const club: ClubResult = {
  id: 'c1',
  clubName: 'Klub Testowy',
  platform: Platform.Tenis4u,
  daySlots: [],
  bookingUrl: 'https://example.com',
  slots: [
    { from: '13:00', to: '14:00', courtName: 'Kort 1', surfaceType: 'Mączka' },
    { from: '14:00', to: '15:00', courtName: 'Kort 1', surfaceType: 'Mączka' },
    { from: '15:00', to: '16:00', courtName: 'Kort 2', surfaceType: 'Hala' },
  ],
}

function setup(over: Partial<{ club: ClubResult; favorite: boolean; selected: boolean }> = {}) {
  const onOpen = vi.fn()
  const utils = render(<ClubCard club={over.club ?? club} favorite={over.favorite ?? false} selected={over.selected ?? false} onOpen={onOpen} />)
  return { onOpen, ...utils }
}

describe('ClubCard', () => {
  it('shows name and summaries', () => {
    setup()
    expect(screen.getByText('Klub Testowy')).toBeTruthy()
    expect(screen.getByText('2 korty · Hala, Mączka')).toBeTruthy()
    expect(screen.getByText('3 wolnych · 13:00–16:00')).toBeTruthy()
  })

  it('opens on main button click, not on star click', () => {
    const { onOpen } = setup()
    fireEvent.click(screen.getByText('star'))
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Klub Testowy/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(club)
  })

  it('does not nest the star in the main button', () => {
    setup()
    expect(screen.getByText('star').closest('button')?.contains(screen.getByText('Klub Testowy'))).toBe(false)
  })

  it('marks selected with aria-current', () => {
    setup({ selected: true })
    expect(screen.getByRole('button', { name: /Klub Testowy/ }).getAttribute('aria-current')).toBe('true')
  })

  it('picks the left border by favorite/platform', () => {
    const fav = setup({ favorite: true })
    expect(fav.container.firstElementChild?.className).toContain('border-l-yellow-400')
    cleanup()
    const green = setup()
    expect(green.container.firstElementChild?.className).toContain('border-l-green-500')
    cleanup()
    const orange = setup({ club: { ...club, platform: Platform.TwojTennis } })
    expect(orange.container.firstElementChild?.className).toContain('border-l-orange-500')
  })

  it('has no booking link', () => {
    const { container } = setup()
    expect(container.querySelector('a')).toBeNull()
  })
})
