// Unit tests for the entitlement token — the no-auth, no-DB proof of purchase. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  signEntitlement,
  verifyEntitlement,
  mintEntitlement,
  type EntitlementClaims,
} from "./entitlement.ts";

const SECRET = "test-secret-do-not-use-in-prod";
const NOW = new Date("2026-06-18T00:00:00Z");

const claims = (over: Partial<EntitlementClaims> = {}): EntitlementClaims => ({
  sessionId: "cs_test_123",
  carrierType: "interstate",
  authorityDate: "2025-09-01",
  dotNumber: "3456789",
  iat: Math.floor(NOW.getTime() / 1000),
  exp: Math.floor(NOW.getTime() / 1000) + 86_400,
  v: 1,
  ...over,
});

test("sign → verify round-trips and returns the claims", () => {
  const token = signEntitlement(claims(), SECRET);
  const out = verifyEntitlement(token, SECRET, NOW);
  assert.ok(out, "valid token must verify");
  assert.equal(out!.sessionId, "cs_test_123");
  assert.equal(out!.carrierType, "interstate");
  assert.equal(out!.authorityDate, "2025-09-01");
  assert.equal(out!.dotNumber, "3456789");
});

test("a tampered payload is rejected (signature no longer matches)", () => {
  const token = signEntitlement(claims(), SECRET);
  const [, sig] = token.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify(claims({ carrierType: "intrastate" })),
    "utf8"
  ).toString("base64url");
  assert.equal(verifyEntitlement(`${forgedPayload}.${sig}`, SECRET, NOW), null);
});

test("the wrong secret is rejected", () => {
  const token = signEntitlement(claims(), SECRET);
  assert.equal(verifyEntitlement(token, "a-different-secret", NOW), null);
});

test("an expired token is rejected", () => {
  const past = Math.floor(NOW.getTime() / 1000) - 10;
  const token = signEntitlement(claims({ iat: past - 100, exp: past }), SECRET);
  assert.equal(verifyEntitlement(token, SECRET, NOW), null);
});

test("garbage / malformed tokens return null, never throw", () => {
  assert.equal(verifyEntitlement("", SECRET, NOW), null);
  assert.equal(verifyEntitlement("not-a-token", SECRET, NOW), null);
  assert.equal(verifyEntitlement("a.b.c", SECRET, NOW), null);
  assert.equal(verifyEntitlement(null, SECRET, NOW), null);
});

test("mintEntitlement sets a future expiry and verifies", () => {
  const token = mintEntitlement(
    { sessionId: "cs_test_x", carrierType: "intrastate", authorityDate: "2026-01-15" },
    SECRET,
    NOW,
    540
  );
  const out = verifyEntitlement(token, SECRET, NOW);
  assert.ok(out);
  assert.equal(out!.carrierType, "intrastate");
  assert.ok(out!.exp > out!.iat, "exp must be after iat");
  assert.equal(out!.dotNumber, undefined, "omitted dotNumber stays omitted");
});
