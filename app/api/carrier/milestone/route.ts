// POST /api/carrier/milestone — body { milestoneKey, done }. Persists the true state of one milestone
// for the signed-in carrier. This is the write that makes the dashboard remember. Auth required.

import { NextResponse } from "next/server";
import { currentCarrier } from "@/lib/session";
import { setMilestoneDone } from "@/lib/carrier-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const carrier = await currentCarrier();
  if (!carrier) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let milestoneKey = "";
  let done = false;
  try {
    const body = await req.json();
    milestoneKey = typeof body?.milestoneKey === "string" ? body.milestoneKey : "";
    done = body?.done === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!milestoneKey) {
    return NextResponse.json({ error: "milestoneKey is required." }, { status: 400 });
  }

  await setMilestoneDone(carrier.id, milestoneKey, done);
  return NextResponse.json({ ok: true });
}
