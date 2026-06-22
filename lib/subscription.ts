// subscription.ts — pure entitlement logic (no DB). Stripe's subscription status is the source of truth;
// the webhook keeps Carrier.subscriptionStatus fresh, and this decides what that status unlocks.
//
// Free, always: account + saved tracking dashboard + the next-action engine.
// Paid (active OR trialing): the done-for-you — prepared documents + proactive reminders.

export interface SubscriptionCarrier {
  subscriptionStatus?: string | null;
  currentPeriodEnd?: Date | string | null;
}

// trialing counts as entitled — the 14-day trial is full access by design.
const ENTITLING = new Set(["active", "trialing"]);

export function isEntitled(carrier: SubscriptionCarrier): boolean {
  return !!carrier.subscriptionStatus && ENTITLING.has(carrier.subscriptionStatus);
}

const fmtDate = (v: Date | string | null | undefined): string | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export function subscriptionLabel(carrier: SubscriptionCarrier): string {
  const end = fmtDate(carrier.currentPeriodEnd);
  switch (carrier.subscriptionStatus) {
    case "trialing":
      return end ? `Free trial — converts ${end}` : "Free trial active";
    case "active":
      return end ? `Active — renews ${end}` : "Active";
    case "past_due":
    case "unpaid":
      return "Payment past due — update your card to keep access";
    case "canceled":
      return "Subscription canceled";
    case "incomplete":
      return "Checkout incomplete";
    default:
      return "No subscription — you're on the free tracking tier";
  }
}
