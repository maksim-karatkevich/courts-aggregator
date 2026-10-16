"use client";

import { use } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubResult, Platform, TimeSlot } from "@/lib/types";
import { StarButton } from "@/features/account/components/StarButton";
import { useFavorites, usePreferences, useRecordBookingClick } from "@/features/account/hooks";
import { lastCourtFor, orderCourts, rankClubs } from "@/features/account/ranking";
import type { Preferences } from "@/features/account/types";

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

function ClubCard({
  club,
  prefs,
  favorite,
  recordBookingClick,
}: {
  club: ClubResult;
  prefs: Preferences;
  favorite: boolean;
  recordBookingClick: (ref: { platform: Platform; clubId: string }, court: string | null) => void;
}) {
  const isTenis4u = club.platform === Platform.Tenis4u;
  const ref = { platform: club.platform, clubId: club.id };
  const courts = groupByCourt(club.slots);
  const courtNames = orderCourts(Array.from(courts.keys()), lastCourtFor(club, prefs));

  return (
    <Card
      className={`border-l-4 ${favorite ? "border-l-yellow-400" : isTenis4u ? "border-l-green-500" : "border-l-orange-500"}`}
    >
      <CardHeader className="px-3 py-2">
        <div className="flex items-center gap-3">
          <StarButton club={ref} />
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
            onClick={() => recordBookingClick(ref, null)}
            className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Zarezerwuj →
          </a>
        </div>
      </CardHeader>

      {club.slots.length > 0 && (
        <CardContent className="px-3 pb-2 pt-0">
          <ul className="divide-y">
            {courtNames.map((court) => (
              <li key={court} className="flex items-center gap-3 py-1 text-xs">
                <span className="w-16 shrink-0 font-medium">{court}</span>
                {courts.get(court)![0]?.surfaceType && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{courts.get(court)![0].surfaceType}</span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {courts.get(court)!.map((slot, i) => (
                    <a
                      key={i}
                      href={club.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordBookingClick(ref, court === "—" ? null : court)}
                      className="rounded border px-2 py-0.5 transition-colors hover:bg-muted"
                    >
                      {slot.from} – {slot.to}
                      {slot.price && <span className="ml-1 font-semibold">{slot.price}</span>}
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

export function ClubList({ clubsPromise }: { clubsPromise: Promise<ClubResult[]> }) {
  const clubs = use(clubsPromise);
  const { prefs, failed } = usePreferences();
  const { error: saveError } = useFavorites();
  const recordBookingClick = useRecordBookingClick();

  if (!clubs.length) return <p className="text-sm text-muted-foreground">Brak dostępnych kortów w wybranym terminie.</p>;

  const { favorites, rest } = rankClubs(clubs, prefs);
  const favoriteKeys = new Set(favorites.map((c) => c.id + "|" + c.platform));
  const renderCard = (club: ClubResult) => (
    <ClubCard
      key={`${club.platform}:${club.id}`}
      club={club}
      prefs={prefs}
      favorite={favoriteKeys.has(club.id + "|" + club.platform)}
      recordBookingClick={recordBookingClick}
    />
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-[760px] mx-auto">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{clubs.length}</span>{" "}
        {clubs.length === 1 ? "klub" : clubs.length <= 4 ? "kluby" : "klubów"} z dostępnymi kortami
      </p>
      {failed && <p role="alert" className="text-sm text-red-600">Nie udało się wczytać ulubionych</p>}
      {saveError && <p role="alert" className="text-sm text-red-600">Nie udało się zapisać. Spróbuj ponownie.</p>}
      {favorites.length > 0 && (
        <>
          <h2 className="text-sm font-semibold">★ Ulubione</h2>
          {favorites.map(renderCard)}
          <h2 className="text-sm font-semibold">Wszystkie wyniki</h2>
        </>
      )}
      {rest.map(renderCard)}
    </div>
  );
}
