import { NextResponse } from "next/server";
import {
  validateInputs,
  assertChargesAllowed,
  buildCheckoutParams,
  getStripe,
  createCheckoutSession,
} from "@/lib/stripe";

// Stripe needs Node APIs (not the edge runtime).
export const runtime = "nodejs";

// Creates a one-time Stripe Checkout Session and returns its hosted URL. The carrier's calendar inputs
// are validated at the boundary and ride along in session metadata so the paid packet is reproducible
// with no account or database. assertChargesAllowed() is the SKU-level echo of the factory's D5 gate.
export async function POST(req: Request) {
  try {
    assertChargesAllowed();
    const inputs = validateInputs(await req.json().catch(() => ({})));
    const origin = process.env.APP_ORIGIN || req.headers.get("origin") || new URL(req.url).origin;
    const stripe = await getStripe();
    const params = buildCheckoutParams({ inputs, origin, priceId: process.env.STRIPE_PRICE_ID || undefined });
    const session = await createCheckoutSession(stripe, params);
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout failed";
    const status = /carrierType|authorityDate/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
