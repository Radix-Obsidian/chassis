// POST /api/auth/logout — destroys the server session and clears the cookie, then redirects home.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await destroySession(token);
  const base = process.env.APP_ORIGIN || new URL(req.url).origin; // public origin behind the proxy
  const res = NextResponse.redirect(new URL("/", base), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
  return res;
}
