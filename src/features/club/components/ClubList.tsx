import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubResult, TimeSlot } from "@/lib/types";
import { use } from "react";

function groupByCourt(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = slot.courtName ?? "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return map;
}

export function ClubListSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-[60%] mx-auto">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {Array.from({ length: 3 }).map((_, j) => (
                <li key={j} className="flex items-center gap-4 py-1.5 px-1">
                  <Skeleton className="h-4 w-28 shrink-0" />
                  <Skeleton className="h-4 w-12 shrink-0" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-12" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function ClubList({ clubsPromise }: { clubsPromise: Promise<ClubResult[]> }) {
  const clubs = use(clubsPromise);

  return (
    <div className="flex flex-col gap-4 w-[60%] mx-auto">
      {clubs.map((club) => (
        <Card key={club.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{club.clubName}</CardTitle>
              <Badge
                className={`capitalize text-white ${
                  club.platform === "tenis4u"
                    ? "bg-green-500 hover:bg-green-500"
                    : "bg-orange-500 hover:bg-orange-500"
                }`}
              >
                {club.platform}
              </Badge>
            </div>
          </CardHeader>
          {club.slots.length > 0 && (
            <CardContent>
              <ul className="divide-y">
                {Array.from(groupByCourt(club.slots)).map(([court, slots]) => (
                  <li key={court} className="flex items-center gap-4 py-1.5 px-1 text-sm">
                    <span className="w-32 shrink-0 font-medium">{court}</span>
                    {slots[0]?.surfaceType && (
                      <span className="text-xs text-muted-foreground shrink-0">{slots[0].surfaceType}</span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot, i) => (
                        <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">
                          {slot.from} – {slot.to}
                          {slot.price && <span className="ml-1 text-muted-foreground">{slot.price}</span>}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
          <CardFooter>
            <a
              href={club.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Book →
            </a>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
