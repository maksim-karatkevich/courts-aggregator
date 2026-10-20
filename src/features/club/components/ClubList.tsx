"use client";

import { ClubResult } from "@/lib/types";
import { useFavoritesSaveError } from "@/features/account/hooks/use-favorites-save-error";
import { usePreferences } from "@/features/account/hooks/use-preferences";
import { clubKey } from "@/features/account/model/club-key";
import { rankClubs } from "@/features/account/model/ranking";
import { ClubCard } from "./ClubCard";

export function ClubList({
  clubs,
  selectedKey,
  onOpen,
}: {
  clubs: ClubResult[];
  selectedKey: string | null;
  onOpen: (club: ClubResult) => void;
}) {
  const { prefs, failed } = usePreferences();
  const saveError = useFavoritesSaveError();

  const { favorites, rest } = rankClubs(clubs, prefs);
  const favoriteKeys = new Set(favorites.map((c) => clubKey({ platform: c.platform, clubId: c.id })));
  const renderCard = (club: ClubResult) => {
    const key = clubKey({ platform: club.platform, clubId: club.id });
    return <ClubCard key={key} club={club} favorite={favoriteKeys.has(key)} selected={key === selectedKey} onOpen={onOpen} />;
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{clubs.length}</span>{" "}
        {clubs.length === 1 ? "klub" : clubs.length <= 4 ? "kluby" : "klubów"} z dostępnymi kortami
      </p>
      {failed && <p role="alert" className="text-sm text-red-600">Nie udało się wczytać ulubionych</p>}
      {saveError && <p role="alert" className="text-sm text-red-600">Nie udało się zapisać. Spróbuj ponownie.</p>}
      {favorites.length > 0 && (
        <>
          <h2 className="text-sm font-semibold">⭐ Ulubione</h2>
          {favorites.map(renderCard)}
          <h2 className="text-sm font-semibold">Wszystkie wyniki</h2>
        </>
      )}
      {rest.map(renderCard)}
    </div>
  );
}
