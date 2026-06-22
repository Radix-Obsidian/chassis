import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { linkCheckout, applySubscriptionState } from "@/lib/billing-store";

export const runtime = "nodejs";

// Stripe webhook: the durable record of billing events. The signature is verified against the raw body
// before we trust the event. Subscription events keep Carrier.subscriptionStatus fresh (the source of
// truth for entitlement); the legacy one-time packet sale is fulfilled by the entitlement route, so its
// completion event is just logged. Handlers are idempotent — re-delivery converges to the same state.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body required for signature verification
  if (!secret || !sig) return NextResponse.json({ error: "webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription") {
          await linkCheckout({
            carrierId: s.client_reference_id ?? (s.metadata?.carrierId as string | undefined) ?? null,
            customerId: typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
            subscriptionId: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
          });
        } else {
          console.log(`[sale] one-time checkout ${s.id} amount=${s.amount_total ?? "?"} ${s.currency ?? ""}`);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription & { current_period_end?: number };
        await applySubscriptionState({
          carrierId: (sub.metadata?.carrierId as string | undefined) ?? null,
          customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          subscriptionId: sub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[webhook] handler failed for ${event.type}:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
