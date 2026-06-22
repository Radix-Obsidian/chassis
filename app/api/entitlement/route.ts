import { NextResponse } from "next/server";
import { getStripe, paidClaimsFromSession } from "@/lib/stripe";
import { mintEntitlement } from "@/lib/entitlement";

export const runtime = "nodejs";

// Exchanges a paid Stripe session id for a signed entitlement token. Payment is verified SERVER-SIDE
// against Stripe — the client's claim that it paid is never trusted. (The packet page does this same
// exchange inline; this route is the programmatic/Playwright entry point.)
export async function GET(req: Request) {
  const secret = process.env.ENTITLEMENT_SIGNING_SECRET;
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!secret) return NextResponse.json({ error: "server not configured" }, { status: 500 });
  if (!sessionId) return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  try {
    const stripe = await getStripe();
    const paid = await paidClaimsFromSession(stripe, sessionId);
    if (!paid) return NextResponse.json({ error: "not paid" }, { status: 402 });
    return NextResponse.json({ token: mintEntitlement(paid, secret) });
  } catch {
    return NextResponse.json({ error: "could not verify session" }, { status: 502 });
  }
}
