// PATCH /api/carrier — update the signed-in carrier's profile (authority date, operation type, USDOT,
// legal name). This is onboarding + edits; it re-anchors the whole calendar. Auth required.

import { NextResponse } from "next/server";
import { currentCarrier } from "@/lib/session";
import { updateCarrierProfile, type CarrierProfileInput } from "@/lib/carrier-store";

export const runtime = "nodejs";

function parseProfile(body: unknown): CarrierProfileInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: CarrierProfileInput = {};

  if (typeof b.authorityDate === "string") {
    if (Number.isNaN(Date.parse(b.authorityDate + "T00:00:00Z"))) {
      throw new Error("authorityDate must be a valid YYYY-MM-DD date");
    }
    out.authorityDate = b.authorityDate;
  }
  if (b.carrierType === "interstate" || b.carrierType === "intrastate") {
    out.carrierType = b.carrierType;
  } else if (b.carrierType !== undefined) {
    throw new Error("carrierType must be 'interstate' or 'intrastate'");
  }
  if (typeof b.dotNumber === "string") out.dotNumber = b.dotNumber.trim().slice(0, 12);
  if (typeof b.legalName === "string") out.legalName = b.legalName.trim().slice(0, 200);
  return out;
}

export async function PATCH(req: Request) {
  const carrier = await currentCarrier();
  if (!carrier) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let input: CarrierProfileInput;
  try {
    input = parseProfile(await req.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  await updateCarrierProfile(carrier.id, input);
  return NextResponse.json({ ok: true });
}
