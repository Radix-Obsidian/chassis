// POST /api/auth/request — body { email }. Emails a one-time magic link. Always responds { ok: true }
// (anti-enumeration: we never reveal whether an account exists). Rate-limit at the edge in production.

import { NextResponse } from "next/server";
import { requestMagicLink, isValidEmail } from "@/lib/auth";

export const runtime = "nodejs";

function originFrom(req: Request): string {
  const env = process.env.APP_ORIGIN;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  try {
    await requestMagicLink(email, originFrom(req));
  } catch (err) {
    console.error("[auth/request] failed:", err);
    // Still return ok to avoid leaking system state; the user simply won't get an email.
  }
  return NextResponse.json({ ok: true });
}
