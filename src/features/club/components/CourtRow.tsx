import type { TimeSlot } from "@/lib/types";

export function CourtRow({
  court,
  slots,
  bookingUrl,
  onBook,
}: {
  court: string;
  slots: TimeSlot[];
  bookingUrl: string;
  onBook: () => void;
}) {
  const surface = slots[0]?.surfaceType;

  return (
    <li className="flex items-center gap-3 py-1 text-xs">
      <span className="w-16 shrink-0 font-medium">{court}</span>
      {surface && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{surface}</span>}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot, i) => (
          <a
            key={i}
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onBook}
            className="rounded border px-2 py-0.5 transition-colors hover:bg-muted"
          >
            {slot.from} – {slot.to}
            {slot.price && <span className="ml-1 font-semibold">{slot.price}</span>}
          </a>
        ))}
      </div>
    </li>
  );
}
