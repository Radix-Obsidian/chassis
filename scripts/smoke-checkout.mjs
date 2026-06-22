#!/usr/bin/env node
// Founder smoke test — proves the REAL Stripe TEST wiring creates a checkout session (not a mock).
// This is the "can the factory take money?" proof at the Stripe boundary.
//
// Usage:  put sk_test_ keys in .env.local, then:
//   node --import tsx scripts/smoke-checkout.mjs
//
// It refuses live keys (TEST-mode only). Open the printed URL, pay with 4242 4242 4242 4242, and you
// land on /navigator/packet unlocked (when run against a deployed instance).

import { readFileSync, existsSync } from "node:fs";

// minimal .env.local loader (no dependency)
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const key = process.env.STRIPE_SECRET_KEY || "";
if (!key) {
  console.error("Set STRIPE_SECRET_KEY (sk_test_...) in .env.local first.");
  process.exit(1);
}
if (/^(sk|rk)_live_/.test(key)) {
  console.error("Refusing: this smoke test is TEST-mode only. Use an sk_test_ key.");
  process.exit(1);
}

const { getStripe, buildCheckoutParams, assertChargesAllowed } = await import("../lib/stripe.ts");

assertChargesAllowed();
const stripe = await getStripe();
const params = buildCheckoutParams({
  inputs: { carrierType: "interstate", authorityDate: "2025-09-01", dotNumber: "3456789" },
  origin: process.env.SMOKE_ORIGIN || "http://localhost:3000",
  priceId: process.env.STRIPE_PRICE_ID || undefined,
});
const session = await stripe.checkout.sessions.create(params);
console.log("✓ Stripe TEST checkout session created (real Stripe call, not a mock).");
console.log("  id:  " + session.id);
console.log("  url: " + session.url);
console.log("\nOpen that URL, pay with 4242 4242 4242 4242 (any future expiry / any CVC / any ZIP).");
console.log("Against a deployed instance you'll land on /navigator/packet with the full packet unlocked.");
