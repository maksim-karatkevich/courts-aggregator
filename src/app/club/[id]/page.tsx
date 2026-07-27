'use client'

import { useParams } from 'next/navigation'

export default function ClubPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main>
      <h1>Club {id}</h1>
    </main>
  )
}
