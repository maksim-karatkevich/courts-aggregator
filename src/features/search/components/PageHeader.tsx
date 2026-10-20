import { AccountButton } from '@/features/account/components/AccountButton'

export function PageHeader() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG served from the icon.svg file convention */}
        <img src="/icon.svg" alt="" className="size-10 shrink-0 lg:size-12" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
        </div>
      </div>
      <AccountButton />
    </header>
  )
}
