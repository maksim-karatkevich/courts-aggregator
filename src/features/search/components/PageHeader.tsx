import { AccountButton } from '@/features/account/components/AccountButton'

export function PageHeader() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Korty Kraków</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dostępność kortów tenisowych w jednym miejscu</p>
      </div>
      <AccountButton />
    </header>
  )
}
