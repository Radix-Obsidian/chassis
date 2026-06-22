// stripe.ts — checkout glue. Pure, testable helpers + a thin runtime client.
//
// The `import type` keeps the Stripe *types* without a runtime dependency, so the unit tests run with
// no `stripe` package installed; the real SDK is loaded lazily (dynamic import) only when getStripe()
// actually runs on the server at request time.

import type Stripe from "stripe";
import {
  UNLOCK_PRICE_CENTS,
  SUBSCRIPTION_PRICE_CENTS,
  SUBSCRIPTION_TRIAL_DAYS,
} from "./pricing";
import { brand } from "../domain/brand";

export type CarrierType = "interstate" | "intrastate";

export interface CheckoutInputs {
  carrierType: CarrierType;
  authorityDate: string; // ISO YYYY-MM-DD
  dotNumber?: string;
}

export function isLiveKey(key: string | undefined | null): boolean {
  return !!key && /^(sk|rk)_live_/.test(key);
}

// The SKU-level echo of the factory's D5 publish+charge gate: even this product physically refuses to
// operate with a LIVE Stripe key unless the founder has deliberately set LIVE_CHARGES_ENABLED=true.
// Test keys always work. This is what keeps "stage go-live, don't execute it" honest at the SKU edge.
export function assertChargesAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (isLiveKey(key) && env.LIVE_CHARGES_ENABLED !== "true") {
    throw new Error(
      "refusing a LIVE Stripe key: real charging is founder-gated — set LIVE_CHARGES_ENABLED=true to go live (see GO-LIVE.md). Use sk_test_ for preview."
    );
  }
}

// Validate the carrier inputs at the trust boundary. Throws with a clear message; never trusts the body.
export function validateInputs(body: unknown): CheckoutInputs {
  const b = (body ?? {}) as Record<string, unknown>;
  const carrierType = b.carrierType;
  if (carrierType !== "interstate" && carrierType !== "intrastate") {
    throw new Error("carrierType must be 'interstate' or 'intrastate'");
  }
  const authorityDate = b.authorityDate;
  if (typeof authorityDate !== "string" || Number.isNaN(Date.parse(authorityDate + "T00:00:00Z"))) {
    throw new Error("authorityDate must be a valid YYYY-MM-DD date");
  }
  const rawDot = typeof b.dotNumber === "string" ? b.dotNumber.trim() : "";
  const dotNumber = rawDot ? rawDot.slice(0, 12) : undefined;
  return { carrierType, authorityDate, ...(dotNumber ? { dotNumber } : {}) };
}

// Pure builder for the Stripe Checkout Session params. One-time payment; the success URL carries the
// session id back to the packet page; the carrier inputs ride along in metadata (so the paid packet is
// reproducible without any database).
export function buildCheckoutParams(opts: {
  inputs: CheckoutInputs;
  origin: string;
  priceId?: string;
  amountCents?: number;
}): Stripe.Checkout.SessionCreateParams {
  const { inputs, origin } = opts;
  const amount = opts.amountCents ?? UNLOCK_PRICE_CENTS;
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = opts.priceId
    ? [{ price: opts.priceId, quantity: 1 }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: brand.products.unlock.name,
              description: brand.products.unlock.description,
            },
          },
        },
      ];
  return {
    mode: "payment",
    line_items,
    success_url: `${origin}/navigator/packet?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/navigator?checkout=cancelled`,
    metadata: {
      carrierType: inputs.carrierType,
      authorityDate: inputs.authorityDate,
      dotNumber: inputs.dotNumber ?? "",
    },
  };
}

// Pure builder for the SUBSCRIPTION Checkout Session — the account-based co-pilot ($/mo + free trial).
// Tied to the carrier account via client_reference_id + subscription metadata so the webhook can map the
// resulting subscription back to the right carrier. Free trial means no card-charge until it converts.
export function buildSubscriptionCheckoutParams(opts: {
  carrierId: string;
  email: string;
  origin: string;
  priceId?: string;
  amountCents?: number;
  trialDays?: number;
  customerId?: string;
}): Stripe.Checkout.SessionCreateParams {
  const amount = opts.amountCents ?? SUBSCRIPTION_PRICE_CENTS;
  const trial = opts.trialDays ?? SUBSCRIPTION_TRIAL_DAYS;
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = opts.priceId
    ? [{ price: opts.priceId, quantity: 1 }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            recurring: { interval: "month" },
            product_data: {
              name: brand.products.subscription.name,
              description: brand.products.subscription.description,
            },
          },
        },
      ];
  return {
    mode: "subscription",
    line_items,
    client_reference_id: opts.carrierId,
    ...(opts.customerId ? { customer: opts.customerId } : { customer_email: opts.email }),
    subscription_data: {
      ...(trial > 0 ? { trial_period_days: trial } : {}),
      metadata: { carrierId: opts.carrierId },
    },
    metadata: { carrierId: opts.carrierId },
    success_url: `${opts.origin}/dashboard?subscribed=1`,
    cancel_url: `${opts.origin}/dashboard/documents?upgrade=cancelled`,
  };
}

// Stripe Customer Portal — where the carrier manages/cancels their plan and card. Injected client = testable.
export async function createBillingPortalSession(
  stripe: Pick<Stripe, "billingPortal">,
  opts: { customerId: string; returnUrl: string }
): Promise<Stripe.BillingPortal.Session> {
  return (stripe as Stripe).billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

// Lazy runtime client — loaded only when actually needed (keeps tests dependency-free).
export async function getStripe(env: NodeJS.ProcessEnv = process.env): Promise<Stripe> {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const { default: StripeCtor } = await import("stripe");
  return new StripeCtor(key);
}

export async function createCheckoutSession(
  stripe: Pick<Stripe, "checkout">,
  params: Stripe.Checkout.SessionCreateParams
): Promise<Stripe.Checkout.Session> {
  return (stripe as Stripe).checkout.sessions.create(params);
}

// Returns the carrier claims IF the session is genuinely paid, else null. Takes the client by injection
// so it's unit-testable with a fake — never trusts the client's word that they paid.
export async function paidClaimsFromSession(
  stripe: Pick<Stripe, "checkout">,
  sessionId: string
): Promise<({ sessionId: string } & CheckoutInputs) | null> {
  const session = await (stripe as Stripe).checkout.sessions.retrieve(sessionId);
  if (!session || session.payment_status !== "paid") return null;
  const m = (session.metadata ?? {}) as Record<string, string>;
  const carrierType: CarrierType = m.carrierType === "intrastate" ? "intrastate" : "interstate";
  if (!m.authorityDate) return null;
  return {
    sessionId,
    carrierType,
    authorityDate: m.authorityDate,
    ...(m.dotNumber ? { dotNumber: m.dotNumber } : {}),
  };
}
