// Unit tests for the checkout glue. No `stripe` package needed (type-only import); the SDK client is
// faked via dependency injection where a call is made. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  isLiveKey,
  assertChargesAllowed,
  validateInputs,
  buildCheckoutParams,
  paidClaimsFromSession,
} from "./stripe.ts";
import { UNLOCK_PRICE_CENTS } from "./pricing.ts";

test("isLiveKey only flags real live/restricted-live keys", () => {
  assert.equal(isLiveKey("sk_live_abc"), true);
  assert.equal(isLiveKey("rk_live_abc"), true);
  assert.equal(isLiveKey("sk_test_abc"), false);
  assert.equal(isLiveKey("pk_test_abc"), false);
  assert.equal(isLiveKey(undefined), false);
});

test("assertChargesAllowed mirrors D5: live key refused unless founder flips the flag", () => {
  assert.throws(() => assertChargesAllowed({ STRIPE_SECRET_KEY: "sk_live_x" } as NodeJS.ProcessEnv), /founder-gated/);
  assert.doesNotThrow(() =>
    assertChargesAllowed({ STRIPE_SECRET_KEY: "sk_live_x", LIVE_CHARGES_ENABLED: "true" } as NodeJS.ProcessEnv)
  );
  assert.doesNotThrow(() => assertChargesAllowed({ STRIPE_SECRET_KEY: "sk_test_x" } as NodeJS.ProcessEnv));
  assert.throws(() => assertChargesAllowed({} as NodeJS.ProcessEnv), /not set/);
});

test("validateInputs accepts good input and rejects bad", () => {
  assert.deepEqual(validateInputs({ carrierType: "interstate", authorityDate: "2025-09-01", dotNumber: " 3456789 " }), {
    carrierType: "interstate",
    authorityDate: "2025-09-01",
    dotNumber: "3456789",
  });
  assert.throws(() => validateInputs({ carrierType: "spaceship", authorityDate: "2025-09-01" }), /carrierType/);
  assert.throws(() => validateInputs({ carrierType: "interstate", authorityDate: "not-a-date" }), /authorityDate/);
  // optional dotNumber stays omitted
  assert.equal("dotNumber" in validateInputs({ carrierType: "intrastate", authorityDate: "2026-01-15" }), false);
});

test("buildCheckoutParams builds a one-time session carrying inputs in metadata + session-id success URL", () => {
  const params = buildCheckoutParams({
    inputs: { carrierType: "interstate", authorityDate: "2025-09-01", dotNumber: "3456789" },
    origin: "https://example.com",
  });
  assert.equal(params.mode, "payment");
  assert.match(String(params.success_url), /\/navigator\/packet\?session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(String(params.cancel_url), /\/navigator/);
  assert.equal(params.metadata?.carrierType, "interstate");
  assert.equal(params.metadata?.authorityDate, "2025-09-01");
  assert.equal(params.metadata?.dotNumber, "3456789");
  const li = (params.line_items ?? [])[0] as any;
  assert.equal(li.price_data.unit_amount, UNLOCK_PRICE_CENTS);
  assert.equal(li.price_data.currency, "usd");
});

test("buildCheckoutParams uses a Price id when provided", () => {
  const params = buildCheckoutParams({
    inputs: { carrierType: "intrastate", authorityDate: "2026-01-15" },
    origin: "https://example.com",
    priceId: "price_123",
  });
  const li = (params.line_items ?? [])[0] as any;
  assert.equal(li.price, "price_123");
  assert.equal(params.metadata?.dotNumber, "");
});

test("paidClaimsFromSession returns claims only when the session is actually paid", async () => {
  const paid = {
    checkout: {
      sessions: {
        retrieve: async () => ({
          payment_status: "paid",
          metadata: { carrierType: "interstate", authorityDate: "2025-09-01", dotNumber: "3456789" },
        }),
      },
    },
  } as any;
  const unpaid = {
    checkout: { sessions: { retrieve: async () => ({ payment_status: "unpaid", metadata: {} }) } },
  } as any;

  const ok = await paidClaimsFromSession(paid, "cs_test_paid");
  assert.ok(ok);
  assert.equal(ok!.carrierType, "interstate");
  assert.equal(ok!.authorityDate, "2025-09-01");
  assert.equal(ok!.sessionId, "cs_test_paid");

  assert.equal(await paidClaimsFromSession(unpaid, "cs_test_unpaid"), null);
});
