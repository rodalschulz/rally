import { AvailabilityPanel } from "@/components/AvailabilityPanel";
import {
  getLatestAvailability,
  type AvailabilitySlots,
} from "@/lib/data/availability";

/** Streamed block — does not block Fechas list paint. */
export async function AvailabilitySection() {
  const availability = await getLatestAvailability();
  return (
    <AvailabilityPanel
      slots={(availability?.slots as AvailabilitySlots | null) ?? null}
      fetchedAt={availability?.fetchedAt?.toISOString() ?? null}
    />
  );
}
