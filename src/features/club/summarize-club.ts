import type { ClubResult } from "@/lib/types";
import { groupByCourt } from "./group-by-court";

export interface ClubSummary {
  courtCount: number;
  surfaces: string[];
  slotCount: number;
  earliest: string;
  latest: string;
}

// Summary of the search window only (club.slots), not the whole day.
export function summarizeClub(club: ClubResult): ClubSummary {
  const surfaces = new Set<string>();
  let earliest = "";
  let latest = "";
  for (const slot of club.slots) {
    if (slot.surfaceType) surfaces.add(slot.surfaceType);
    if (!earliest || slot.from < earliest) earliest = slot.from;
    if (!latest || slot.to > latest) latest = slot.to;
  }
  return {
    courtCount: groupByCourt(club.slots).size,
    surfaces: [...surfaces].sort((a, b) => a.localeCompare(b, "pl")),
    slotCount: club.slots.length,
    earliest,
    latest,
  };
}

export function formatCourtCount(n: number): string {
  if (n === 1) return "1 kort";
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} korty`;
  return `${n} kortów`;
}
