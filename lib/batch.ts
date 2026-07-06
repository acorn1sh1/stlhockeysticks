import { prisma } from "./db";
import { nextBatch } from "./catalog";

// Returns the batch new pre-orders should attach to. Retires any OPEN
// batch whose cutoff has already passed (so a stale batch never silently
// absorbs orders meant for the next cycle), then finds-or-creates the
// batch matching the current cutoff.
export async function getOrCreateOpenBatch() {
  const { cutoff, pickupStart, pickupEnd } = nextBatch();
  const now = new Date();

  await prisma.batch.updateMany({
    where: { status: "OPEN", cutoffDate: { lte: now } },
    data: { status: "ORDERED" },
  });

  const existing = await prisma.batch.findFirst({
    where: { status: "OPEN", cutoffDate: cutoff },
  });
  if (existing) return existing;

  const name = `${cutoff.toLocaleString("en-US", { month: "long", year: "numeric" })} Batch`;
  return prisma.batch.create({
    data: { name, cutoffDate: cutoff, pickupStart, pickupEnd },
  });
}
