// auth-tokens.ts — passwordless token primitives. Pure crypto, no DB, no deps beyond node:crypto, so
// it unit-tests with nothing installed.
//
// The contract everywhere: we hand the RAW token to the user (emailed magic link, or session cookie)
// and persist ONLY its SHA-256 hash. A stolen database therefore yields no usable tokens, and lookups
// are by hash. Comparison is constant-time to avoid timing leaks.

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export interface IssuedToken {
  raw: string; // give this to the user; never store it
  hash: string; // store this
}

// 32 random bytes → ~43-char base64url string. Plenty of entropy for a single-use/login token.
export function generateToken(bytes = 32): IssuedToken {
  const raw = randomBytes(bytes).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Constant-time check that `raw` hashes to `expectedHash`. Any bad/short/empty input → false (fail closed).
export function verifyToken(
  raw: string | null | undefined,
  expectedHash: string | null | undefined
): boolean {
  if (!raw || !expectedHash) return false;
  let got: Buffer;
  let exp: Buffer;
  try {
    got = Buffer.from(hashToken(raw), "hex");
    exp = Buffer.from(expectedHash, "hex");
  } catch {
    return false;
  }
  if (got.length === 0 || got.length !== exp.length) return false;
  return timingSafeEqual(new Uint8Array(got), new Uint8Array(exp));
}

// Fail-closed expiry: an unparseable or past timestamp counts as expired. The exact boundary is expired.
export function isExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const t = expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

export function expiryFromNow(minutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + minutes * 60_000);
}
