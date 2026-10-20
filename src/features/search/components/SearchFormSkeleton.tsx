import { Skeleton } from '@/components/ui/skeleton'

// Same footprint as SearchForm (date row + options row) so nothing jumps on hydration.
export function SearchFormSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
