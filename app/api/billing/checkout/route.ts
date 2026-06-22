// POST /api/billing/checkout — starts the subscription (14-day trial). Auth required; the session is tied
// to the signed-in carrier so the webhook maps the resulting subscription back to their account.
// assertChargesAllowed() is the SKU-level echo of the factory's D5 gate (refuses live keys unless enabled).

import { NextResponse } from "next/server";
import { currentCarrier } from "@/lib/session";
import {
  assertChargesAllowed,
  buildSubscriptionCheckoutParams,
  getStripe,
  createCheckoutSession,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const carrier = await currentCarrier();
  if (!carrier) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    assertChargesAllowed();
    const origin = process.env.APP_ORIGIN || req.headers.get("origin") || new URL(req.url).origin;
    const stripe = await getStripe();
    const params = buildSubscriptionCheckoutParams({
      carrierId: carrier.id,
      email: carrier.email,
      origin,
      priceId: process.env.STRIPE_SUBSCRIPTION_PRICE_ID || undefined,
      customerId: carrier.stripeCustomerId || undefined,
    });
    const session = await createCheckoutSession(stripe, params);
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
