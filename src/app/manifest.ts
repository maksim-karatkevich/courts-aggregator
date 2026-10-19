import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Korty Kraków',
    short_name: 'Korty',
    description: 'Dostępność kortów tenisowych w jednym miejscu',
    start_url: '/',
    display: 'standalone',
    lang: 'pl',
    theme_color: '#15803d',
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png' },
    ],
  }
}
