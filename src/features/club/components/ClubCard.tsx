import { ClubResult, Platform } from "@/lib/types";
import { StarButton } from "@/features/account/components/StarButton";
import { formatCourtCount, formatSlotCount, summarizeClub } from "../summarize-club";

export function ClubCard({
  club,
  favorite,
  selected,
  onOpen,
}: {
  club: ClubResult;
  favorite: boolean;
  selected: boolean;
  onOpen: (club: ClubResult) => void;
}) {
  const summary = summarizeClub(club);
  const border = favorite ? "border-l-yellow-400" : club.platform === Platform.Tenis4u ? "border-l-green-500" : "border-l-orange-500";
  const courts = [formatCourtCount(summary.courtCount), ...(summary.surfaces.length ? [summary.surfaces.join(", ")] : [])].join(" · ");

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border border-l-4 bg-card pl-2 ${border} ${selected ? "ring-2 ring-blue-500" : ""}`}
    >
      <StarButton club={{ platform: club.platform, clubId: club.id }} />
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onOpen(club)}
        className="flex flex-1 items-center gap-2 py-2 pr-3 text-left"
      >
        <span className="flex-1">
          <span className="block text-sm font-semibold">{club.clubName}</span>
          <span className="block text-xs text-muted-foreground">{courts}</span>
          <span className="block text-xs text-muted-foreground">
            {formatSlotCount(summary.slotCount)} · {summary.earliest}–{summary.latest}
          </span>
        </span>
        <span aria-hidden className={selected ? "text-blue-500" : "text-muted-foreground"}>›</span>
      </button>
    </div>
  );
}
