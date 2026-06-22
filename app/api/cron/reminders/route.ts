// POST /api/cron/reminders — the proactive-reminder sweep, fired by a scheduler (Railway cron, etc.).
// Fail-closed: requires the shared CRON_SECRET (Authorization: Bearer <secret>, or x-cron-secret). With
// no CRON_SECRET set, every call is rejected — the loop can't be triggered by a stranger.

import { NextResponse } from "next/server";
import { sweepReminders } from "@/lib/reminder-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const provided = req.headers.get("x-cron-secret") || bearer;
  return provided.length === secret.length && provided === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const origin = process.env.APP_ORIGIN || new URL(req.url).origin;
  try {
    const summary = await sweepReminders(origin);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[cron/reminders] sweep failed:", err);
    return NextResponse.json({ error: "sweep failed" }, { status: 500 });
  }
}
