export function detectSurface(name: string, type?: string): string {
  const text = `${type ?? ''} ${name}`.toLowerCase()

  const indoor =
    text.includes('hala') ||
    text.includes('indoor') ||
    text.includes('kryty') ||
    text.includes('kryta')

  let surface = 'Inne'
  if (text.includes('mączk') || text.includes('clay') || text.includes('ceglast'))
    surface = 'Mączka'
  else if (text.includes('tward') || text.includes('hard') || text.includes('akryl') || text.includes('beton'))
    surface = 'Twarda'
  else if (text.includes('traw') || text.includes('grass'))
    surface = 'Trawa'
  else if (text.includes('dywan') || text.includes('carpet') || text.includes('syntetycz'))
    surface = 'Syntetyk'

  return indoor ? `Hala · ${surface}` : surface
}

export const SURFACE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Mączka':         { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'Hala · Mączka':  { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'Twarda':         { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Hala · Twarda':  { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Trawa':          { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'Syntetyk':       { bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  'Hala · Syntetyk':{ bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  'Inne':           { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
}

export function surfaceColor(surface: string) {
  return SURFACE_COLORS[surface] ?? SURFACE_COLORS['Inne']
}
