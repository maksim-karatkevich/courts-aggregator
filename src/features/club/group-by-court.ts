import type { TimeSlot } from "@/lib/types";

// Slots without a court name are grouped under "—".
export const UNNAMED_COURT = "—";

export function groupByCourt(slots: TimeSlot[]): Map<string, TimeSlot[]> {
  const map = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = slot.courtName ?? UNNAMED_COURT;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(slot);
  }
  return map;
}
