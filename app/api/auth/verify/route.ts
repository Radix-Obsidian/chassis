// GET /api/auth/verify?token=... — the magic-link landing. Validates + single-uses the token, opens a
// session, sets an httpOnly cookie, and redirects to the dashboard. Invalid/expired → back to /signin.

import { NextResponse } from "next/server";
import { consumeMagicLink, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  // Behind a proxy (Railway) req.url carries the internal host (localhost:PORT); redirects must use the
  // public origin or the browser is sent to localhost. APP_ORIGIN is the source of truth.
  const base = process.env.APP_ORIGIN || url.origin;

  const session = await consumeMagicLink(token);
  if (!session) {
    return NextResponse.redirect(new URL("/signin?error=expired", base));
  }

  const res = NextResponse.redirect(new URL("/dashboard", base));
  res.cookies.set(SESSION_COOKIE, session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return res;
}
