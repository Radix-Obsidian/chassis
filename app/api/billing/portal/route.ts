// POST /api/billing/portal — opens the Stripe Customer Portal so the carrier can update their card, view
// invoices, or cancel. Auth required; only works once they have a Stripe customer (i.e. have subscribed).

import { NextResponse } from "next/server";
import { currentCarrier } from "@/lib/session";
import { getStripe, createBillingPortalSession } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const carrier = await currentCarrier();
  if (!carrier) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!carrier.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet — start a subscription first." }, { status: 400 });
  }
  try {
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const stripe = await getStripe();
    const session = await createBillingPortalSession(stripe, {
      customerId: carrier.stripeCustomerId,
      returnUrl: `${origin}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "portal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
