import { ImageResponse } from 'next/og'
import { TennisIcon } from './_icon/tennis-icon'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<TennisIcon size={512} />, size)
}
