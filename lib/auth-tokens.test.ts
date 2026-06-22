import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateToken,
  hashToken,
  verifyToken,
  isExpired,
  expiryFromNow,
} from "./auth-tokens";

test("generateToken returns a raw token and its matching hash", () => {
  const { raw, hash } = generateToken();
  assert.equal(typeof raw, "string");
  assert.ok(raw.length >= 32, "raw token should be long enough to resist guessing");
  assert.equal(hash, hashToken(raw));
});

test("generateToken is unique across calls (random)", () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a.raw, b.raw);
  assert.notEqual(a.hash, b.hash);
});

test("hashToken is deterministic and hex sha256 (64 chars)", () => {
  const h1 = hashToken("hello");
  const h2 = hashToken("hello");
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test("verifyToken accepts the right raw token for a stored hash", () => {
  const { raw, hash } = generateToken();
  assert.equal(verifyToken(raw, hash), true);
});

test("verifyToken rejects a wrong/forged token", () => {
  const { hash } = generateToken();
  assert.equal(verifyToken("not-the-token", hash), false);
});

test("verifyToken rejects null/empty inputs (never crashes)", () => {
  assert.equal(verifyToken(null, "abc"), false);
  assert.equal(verifyToken("abc", null), false);
  assert.equal(verifyToken(undefined, undefined), false);
  assert.equal(verifyToken("", ""), false);
});

test("verifyToken rejects a hash of the wrong length without throwing", () => {
  const { raw } = generateToken();
  assert.equal(verifyToken(raw, "deadbeef"), false);
});

test("isExpired is false before expiry, true at/after", () => {
  const now = new Date("2026-06-20T12:00:00Z");
  assert.equal(isExpired(new Date("2026-06-20T12:01:00Z"), now), false);
  assert.equal(isExpired(new Date("2026-06-20T11:59:00Z"), now), true);
  assert.equal(isExpired(new Date("2026-06-20T12:00:00Z"), now), true); // exact boundary = expired
});

test("isExpired treats an unparseable date as expired (fail closed)", () => {
  assert.equal(isExpired("not-a-date", new Date("2026-06-20T12:00:00Z")), true);
});

test("isExpired accepts ISO string expiries", () => {
  const now = new Date("2026-06-20T12:00:00Z");
  assert.equal(isExpired("2026-06-20T12:05:00Z", now), false);
  assert.equal(isExpired("2026-06-20T11:55:00Z", now), true);
});

test("expiryFromNow adds the given minutes", () => {
  const now = new Date("2026-06-20T12:00:00Z");
  const exp = expiryFromNow(15, now);
  assert.equal(exp.toISOString(), "2026-06-20T12:15:00.000Z");
});
