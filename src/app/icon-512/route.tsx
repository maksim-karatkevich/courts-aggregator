import { ImageResponse } from 'next/og'
import { TennisIcon } from '../_icon/tennis-icon'

// Plain route handler: the tab icon is the static icon.svg, so this serves the 512px PNG for the manifest.
export function GET() {
  return new ImageResponse(<TennisIcon size={512} />, { width: 512, height: 512 })
}
