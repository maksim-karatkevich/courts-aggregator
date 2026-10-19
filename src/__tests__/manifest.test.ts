import { describe, expect, it } from 'vitest'
import manifest from '@/app/manifest'

describe('manifest', () => {
  it('has the install fields', () => {
    const m = manifest()
    expect(m.name).toBe('Korty Kraków')
    expect(m.short_name).toBeTruthy()
    expect(m.start_url).toBe('/')
    expect(m.display).toBe('standalone')
    expect(m.theme_color).toBeTruthy()
    expect(m.background_color).toBeTruthy()
    const sizes = (m.icons ?? []).map((i) => i.sizes)
    expect(sizes).toContain('512x512')
    expect(sizes).toContain('192x192')
  })
})
