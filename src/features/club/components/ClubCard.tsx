import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClubResult, Platform } from "@/lib/types";
import { StarButton } from "@/features/account/components/StarButton";
import { lastCourtFor, orderCourts } from "@/features/account/ranking";
import type { ClubRef, Preferences } from "@/features/account/types";
import { groupByCourt, UNNAMED_COURT } from "../group-by-court";
import { CourtRow } from "./CourtRow";

export function ClubCard({
  club,
  prefs,
  favorite,
  recordBookingClick,
}: {
  club: ClubResult;
  prefs: Preferences;
  favorite: boolean;
  recordBookingClick: (ref: ClubRef, court: string | null) => void;
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
              <CourtRow
                key={court}
                court={court}
                slots={courts.get(court)!}
                bookingUrl={club.bookingUrl}
                onBook={() => recordBookingClick(ref, court === UNNAMED_COURT ? null : court)}
              />
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
