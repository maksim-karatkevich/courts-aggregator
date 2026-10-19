'use client'

import { Suspense } from 'react'
import { ClubPageContent } from '@/features/club/components/ClubPageContent'

export default function ClubPage() {
  return (
    <Suspense fallback={null}>
      <ClubPageContent />
    </Suspense>
  )
}
