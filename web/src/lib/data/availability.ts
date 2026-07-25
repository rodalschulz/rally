import { prisma } from "@/lib/db";

export type AvailabilitySlots = Record<string, Record<string, string[]>>;

export async function getLatestAvailability() {
  return prisma.availabilitySnapshot.findUnique({ where: { id: "latest" } });
}
