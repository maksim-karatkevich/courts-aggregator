'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'

function ClubPageContent() {
  const { id } = useParams<{ id: string }>()

  return (
    <main>
      <h1>Club {id}</h1>
    </main>
  )
}

export default function ClubPage() {
  return (
    <Suspense fallback={null}>
      <ClubPageContent />
    </Suspense>
  )
}
