// entitlement.ts — the one-time unlock, with NO accounts and NO database.
//
// A paid customer's proof of purchase is a single HMAC-signed token (signed with a server-only
// secret). It carries the carrier's calendar inputs as claims, so the full audit packet is
// reproducible from the token alone — the signed token *is* the entitlement. Server mints it after
// Stripe confirms payment; server verifies it before rendering the paid packet. The client never
// holds the secret and cannot forge a token.
//
// Honest scope: this gates the paid EXPERIENCE (the full packet + export). The underlying data is the
// carrier's own inputs + public federal regs, so this is convenience-gating, not secret-data DRM —
// appropriate for the product, and it keeps us auth-free.

import { createHmac, timingSafeEqual } from "node:crypto";

export type CarrierType = "interstate" | "intrastate";

export interface EntitlementClaims {
  sessionId: string;
  carrierType: CarrierType;
  authorityDate: string; // ISO YYYY-MM-DD — anchors the whole calendar
  dotNumber?: string;
  iat: number; // issued-at, unix seconds
  exp: number; // expiry, unix seconds
  v: 1;
}

const DAY_SECONDS = 86_400;

const b64url = (buf: Buffer): string => buf.toString("base64url");
const fromB64url = (s: string): Buffer => Buffer.from(s, "base64url");

const sign = (payloadB64: string, secret: string): Buffer =>
  createHmac("sha256", secret).update(payloadB64).digest();

export function signEntitlement(claims: EntitlementClaims, secret: string): string {
  if (!secret) throw new Error("signEntitlement: a signing secret is required");
  const payload = b64url(Buffer.from(JSON.stringify(claims), "utf8"));
  return `${payload}.${b64url(sign(payload, secret))}`;
}

// Returns the validated claims, or null for anything wrong (bad shape, bad signature, expired).
// Null is the only failure mode — callers treat null as "not unlocked".
export function verifyEntitlement(
  token: string | null | undefined,
  secret: string,
  now: Date = new Date()
): EntitlementClaims | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, providedSig] = parts;

  const expected = sign(payload, secret);
  let provided: Buffer;
  try {
    provided = fromB64url(providedSig);
  } catch {
    return null;
  }
  // copy into plain Uint8Arrays — sidesteps the @types/node Buffer/ArrayBufferView lib mismatch;
  // constant-time compare is preserved (lengths are checked first).
  if (provided.length !== expected.length || !timingSafeEqual(new Uint8Array(provided), new Uint8Array(expected)))
    return null;

  let claims: EntitlementClaims;
  try {
    claims = JSON.parse(fromB64url(payload).toString("utf8")) as EntitlementClaims;
  } catch {
    return null;
  }
  if (claims?.v !== 1 || typeof claims.exp !== "number") return null;
  if (claims.exp * 1000 < now.getTime()) return null;
  return claims;
}

export function mintEntitlement(
  input: { sessionId: string; carrierType: CarrierType; authorityDate: string; dotNumber?: string },
  secret: string,
  now: Date = new Date(),
  ttlDays = 540 // ~the 18-month new-entrant program
): string {
  const iat = Math.floor(now.getTime() / 1000);
  const claims: EntitlementClaims = {
    sessionId: input.sessionId,
    carrierType: input.carrierType,
    authorityDate: input.authorityDate,
    ...(input.dotNumber ? { dotNumber: input.dotNumber } : {}),
    iat,
    exp: iat + ttlDays * DAY_SECONDS,
    v: 1,
  };
  return signEntitlement(claims, secret);
}
