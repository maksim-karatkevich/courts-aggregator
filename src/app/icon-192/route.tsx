import { ImageResponse } from 'next/og'
import { TennisIcon } from '../_icon/tennis-icon'

// Plain route handler: icon.tsx can only serve one size at /icon.
export function GET() {
  return new ImageResponse(<TennisIcon size={192} />, { width: 192, height: 192 })
}
