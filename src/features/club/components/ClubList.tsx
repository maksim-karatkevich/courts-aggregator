import { use } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubResult, Platform, TimeSlot } from "@/lib/types";

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

export function ClubList({ clubsPromise }: { clubsPromise: Promise<ClubResult[]> }) {
  const clubs = use(clubsPromise);

  if (!clubs.length) return <p className="text-sm text-muted-foreground">Brak dostępnych kortów w wybranym terminie.</p>;

  return (
    <div className="flex flex-col gap-3 w-full max-w-[760px] mx-auto">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{clubs.length}</span>{" "}
        {clubs.length === 1 ? "klub" : clubs.length <= 4 ? "kluby" : "klubów"} z dostępnymi kortami
      </p>
      {clubs.map((club) => {
        const isTenis4u = club.platform === Platform.Tenis4u;
        const courts = groupByCourt(club.slots);

        return (
          <Card
            key={club.id}
            className={`border-l-4 ${isTenis4u ? "border-l-green-500" : "border-l-orange-500"}`}
          >
            <CardHeader className="px-3 py-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold flex-1">{club.clubName}</CardTitle>
                <Badge
                  variant="outline"
                  className={`capitalize text-xs ${isTenis4u ? "border-green-400 text-green-700" : "border-orange-400 text-orange-700"}`}
                >
                  {club.platform}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">~75 zł/h</span>
                <a
                  href={club.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Zarezerwuj →
                </a>
              </div>
            </CardHeader>

            {club.slots.length > 0 && (
              <CardContent className="px-3 pb-2 pt-0">
                <ul className="divide-y">
                  {Array.from(courts).map(([court, slots]) => (
                    <li key={court} className="flex items-center gap-3 py-1 text-xs">
                      <span className="w-16 shrink-0 font-medium">{court}</span>
                      {slots[0]?.surfaceType && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{slots[0].surfaceType}</span>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {slots.map((slot, i) => (
                          <span key={i} className="rounded border px-2 py-0.5">
                            {slot.from} – {slot.to}
                            {slot.price && <span className="ml-1 font-semibold">{slot.price}</span>}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}

          </Card>
        );
      })}
    </div>
  );
}
