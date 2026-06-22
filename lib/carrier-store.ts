// carrier-store.ts — the persistence operations behind the dashboard. DB-bound (imports ./db). These
// are the writes that make the loop "remember": a toggled milestone or an updated profile survives the
// session, the device, and the logout. Without these the product is a calculator; with them it's a record.

import { prisma } from "./db";
import type { CarrierType } from "./calendar-engine";
import type { StoredMilestoneState } from "./carrier-view";

export interface CarrierProfileInput {
  authorityDate?: string; // ISO YYYY-MM-DD
  carrierType?: CarrierType;
  dotNumber?: string;
  legalName?: string;
}

export async function getMilestoneStates(carrierId: string): Promise<StoredMilestoneState[]> {
  const rows = await prisma.milestoneState.findMany({ where: { carrierId } });
  return rows.map((r) => ({ milestoneKey: r.milestoneKey, completedAt: r.completedAt }));
}

// Mark a milestone done/undone. Upsert keeps it idempotent and unique per (carrier, milestone).
export async function setMilestoneDone(
  carrierId: string,
  milestoneKey: string,
  done: boolean,
  now: Date = new Date()
): Promise<void> {
  const completedAt = done ? now : null;
  await prisma.milestoneState.upsert({
    where: { carrierId_milestoneKey: { carrierId, milestoneKey } },
    update: { completedAt },
    create: { carrierId, milestoneKey, completedAt },
  });
}

export async function updateCarrierProfile(
  carrierId: string,
  input: CarrierProfileInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (input.authorityDate) data.authorityDate = new Date(input.authorityDate + "T00:00:00Z");
  if (input.carrierType) data.carrierType = input.carrierType;
  if (input.dotNumber !== undefined) data.dotNumber = input.dotNumber || null;
  if (input.legalName !== undefined) data.legalName = input.legalName || null;
  if (Object.keys(data).length === 0) return;
  await prisma.carrier.update({ where: { id: carrierId }, data });
}
