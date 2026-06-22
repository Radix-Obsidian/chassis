// auth.ts — passwordless (magic-link) authentication flows. DB-bound (imports ./db), so it is NOT on
// the dependency-free unit-test path; the token math it relies on (./auth-tokens) is tested separately.
//
// Flow: requestMagicLink emails a one-time link → consumeMagicLink validates it, upserts the carrier,
// and opens a session → getCarrierFromSession reads the session cookie on every protected request.
// We persist only token HASHES (see auth-tokens.ts); raw values live in the email link and the cookie.

import { prisma } from "./db";
import {
  generateToken,
  hashToken,
  isExpired,
  expiryFromNow,
} from "./auth-tokens";
import { sendEmail } from "./email";
import { magicLinkEmail } from "./email-templates";

export const SESSION_COOKIE = "dn_session";
const MAGIC_LINK_TTL_MIN = 15;
const SESSION_TTL_MIN = 60 * 24 * 30; // 30 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return EMAIL_RE.test(e) && e.length <= 254;
}

// Always returns ok — we never reveal whether an email already has an account (anti-enumeration).
export async function requestMagicLink(
  rawEmail: string,
  origin: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ ok: boolean }> {
  if (!isValidEmail(rawEmail)) return { ok: false };
  const email = normalizeEmail(rawEmail);
  const { raw, hash } = generateToken();
  await prisma.magicLink.create({
    data: { email, tokenHash: hash, expiresAt: expiryFromNow(MAGIC_LINK_TTL_MIN) },
  });
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(raw)}`;
  await sendEmail(magicLinkEmail(email, link), env);
  return { ok: true };
}

export interface ConsumedSession {
  carrierId: string;
  sessionToken: string; // raw — set as the cookie
  expiresAt: Date;
}

// Validates + single-uses the magic link, upserts the carrier, and opens a session. Null on any failure.
export async function consumeMagicLink(rawToken: string | null | undefined): Promise<ConsumedSession | null> {
  if (!rawToken) return null;
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!link || link.consumedAt || isExpired(link.expiresAt)) return null;

  // single-use: consume first; if a race already consumed it, updateMany count is 0 → bail.
  const consumed = await prisma.magicLink.updateMany({
    where: { id: link.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) return null;

  const carrier = await prisma.carrier.upsert({
    where: { email: link.email },
    update: {},
    create: { email: link.email },
  });

  const session = generateToken();
  const expiresAt = expiryFromNow(SESSION_TTL_MIN);
  await prisma.session.create({
    data: { carrierId: carrier.id, tokenHash: session.hash, expiresAt },
  });
  return { carrierId: carrier.id, sessionToken: session.raw, expiresAt };
}

export async function getCarrierFromSession(rawToken: string | null | undefined) {
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { carrier: true },
  });
  if (!session || isExpired(session.expiresAt)) return null;
  return session.carrier;
}

export async function destroySession(rawToken: string | null | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } });
}
