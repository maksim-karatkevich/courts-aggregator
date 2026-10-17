import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClubListSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full max-w-[760px] mx-auto">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-muted">
          <CardHeader className="px-3 py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0">
            <ul className="divide-y">
              {Array.from({ length: 2 }).map((_, j) => (
                <li key={j} className="flex items-center gap-3 py-1.5">
                  <Skeleton className="h-3 w-16 shrink-0" />
                  <Skeleton className="h-4 w-14 rounded shrink-0" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-5 w-20 rounded" />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
