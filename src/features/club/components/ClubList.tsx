"use client";

import { use } from "react";
import { ClubResult } from "@/lib/types";
import { useFavoritesSaveError } from "@/features/account/hooks/use-favorites-save-error";
import { usePreferences } from "@/features/account/hooks/use-preferences";
import { useRecordBookingClick } from "@/features/account/hooks/use-record-booking-click";
import { rankClubs } from "@/features/account/model/ranking";
import { ClubCard } from "./ClubCard";

export function ClubList({ clubsPromise }: { clubsPromise: Promise<ClubResult[]> }) {
  const clubs = use(clubsPromise);
  const { prefs, failed } = usePreferences();
  const saveError = useFavoritesSaveError();
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
