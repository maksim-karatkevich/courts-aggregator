import { describe, expect, it } from 'vitest'
import { scrollTopFor } from '@/features/calendar/model/scroll-top'

describe('scrollTopFor', () => {
  it('subtracts the header once', () => {
    expect(scrollTopFor(500, 100, 0, 40)).toBe(360)
  })
  it('accounts for current scroll', () => {
    expect(scrollTopFor(60, 100, 200, 40)).toBe(120)
  })
  it('never goes negative', () => {
    expect(scrollTopFor(110, 100, 0, 40)).toBe(0)
  })
})
