// billing-store.ts — maps Stripe subscription lifecycle onto the Carrier record (DB-bound). The webhook
// extracts plain fields from Stripe events and calls these; entitlement (lib/subscription.ts) then reads
// Carrier.subscriptionStatus. updateMany is used so a stray event for an unknown carrier no-ops instead of
// throwing.

import { prisma } from "./db";

export async function linkCheckout(opts: {
  carrierId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  if (!opts.carrierId) return;
  const data: Record<string, unknown> = {};
  if (opts.customerId) data.stripeCustomerId = opts.customerId;
  if (opts.subscriptionId) data.subscriptionId = opts.subscriptionId;
  if (Object.keys(data).length === 0) return;
  await prisma.carrier.updateMany({ where: { id: opts.carrierId }, data });
}

export async function applySubscriptionState(opts: {
  carrierId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  status: string;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const where = opts.carrierId
    ? { id: opts.carrierId }
    : opts.customerId
      ? { stripeCustomerId: opts.customerId }
      : null;
  if (!where) return;

  const data: Record<string, unknown> = { subscriptionStatus: opts.status };
  if (opts.subscriptionId) data.subscriptionId = opts.subscriptionId;
  if (opts.customerId) data.stripeCustomerId = opts.customerId;
  if (opts.currentPeriodEnd) data.currentPeriodEnd = opts.currentPeriodEnd;

  await prisma.carrier.updateMany({ where, data });
}
