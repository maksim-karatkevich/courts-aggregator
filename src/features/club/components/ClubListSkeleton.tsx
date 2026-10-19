import { Skeleton } from "@/components/ui/skeleton";

export function ClubListSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-l-4 border-l-muted px-3 py-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}
