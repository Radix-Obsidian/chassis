import { test } from "node:test";
import assert from "node:assert/strict";
import { isEntitled, subscriptionLabel } from "./subscription";

test("active and trialing carriers are entitled", () => {
  assert.equal(isEntitled({ subscriptionStatus: "active" }), true);
  assert.equal(isEntitled({ subscriptionStatus: "trialing" }), true);
});

test("missing or non-entitling statuses are not entitled", () => {
  assert.equal(isEntitled({ subscriptionStatus: null }), false);
  assert.equal(isEntitled({ subscriptionStatus: undefined }), false);
  assert.equal(isEntitled({}), false);
  assert.equal(isEntitled({ subscriptionStatus: "past_due" }), false);
  assert.equal(isEntitled({ subscriptionStatus: "canceled" }), false);
  assert.equal(isEntitled({ subscriptionStatus: "incomplete" }), false);
});

test("subscriptionLabel describes the state for the UI", () => {
  assert.match(subscriptionLabel({ subscriptionStatus: "trialing", currentPeriodEnd: "2026-07-01" }), /trial/i);
  assert.match(subscriptionLabel({ subscriptionStatus: "active", currentPeriodEnd: "2026-07-01" }), /active|renews/i);
  assert.match(subscriptionLabel({ subscriptionStatus: "past_due" }), /past.?due|payment/i);
  assert.match(subscriptionLabel({ subscriptionStatus: null }), /no.*subscription|free/i);
});
