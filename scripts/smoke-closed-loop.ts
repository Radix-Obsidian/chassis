// smoke-closed-loop.ts — end-to-end proof of the closed loop against a REAL Postgres (not mocks).
// Run with DATABASE_URL set:
//   DATABASE_URL=postgresql://... node --import tsx scripts/smoke-closed-loop.ts
//
// It exercises the actual library code paths a request would hit: passwordless sign-in → session →
// persisted profile + milestone state (the "remembers" claim) → entitlement gating → document prep →
// reminder sweep. Every assertion runs against live rows. Idempotent: it cleans up the test carrier first.

import assert from "node:assert/strict";
import { prisma } from "../lib/db";
import { generateToken, expiryFromNow } from "../lib/auth-tokens";
import { consumeMagicLink, requestMagicLink, getCarrierFromSession } from "../lib/auth";
import { updateCarrierProfile, setMilestoneDone, getMilestoneStates } from "../lib/carrier-store";
import { buildDashboardView } from "../lib/carrier-view";
import { generateDocument } from "../lib/documents";
import { isEntitled } from "../lib/subscription";
import { sweepReminders } from "../lib/reminder-runner";

const EMAIL = "smoke@dot-navigator.test";
const log = (m: string) => console.log(`  ✓ ${m}`);

async function main() {
  // clean slate
  await prisma.carrier.deleteMany({ where: { email: EMAIL } });
  await prisma.magicLink.deleteMany({ where: { email: EMAIL } });

  // 1) request a magic link — proves the write path (email no-ops without BREVO_API_KEY)
  await requestMagicLink(EMAIL, "http://localhost:3000");
  const created = await prisma.magicLink.count({ where: { email: EMAIL } });
  assert.ok(created >= 1, "requestMagicLink persisted a token");
  log("magic link requested + persisted (email no-op without BREVO key)");

  // 2) simulate clicking the emailed link: mint a token the same way requestMagicLink does, then consume
  const { raw, hash } = generateToken();
  await prisma.magicLink.create({ data: { email: EMAIL, tokenHash: hash, expiresAt: expiryFromNow(15) } });
  const session = await consumeMagicLink(raw);
  assert.ok(session, "consumeMagicLink returned a session");
  log("magic link consumed → carrier upserted + session opened");

  // single-use: a second consume of the same token must fail
  assert.equal(await consumeMagicLink(raw), null, "token is single-use");
  log("token is single-use (replay rejected)");

  // 3) session cookie → carrier (the auth read path)
  const carrier = await getCarrierFromSession(session!.sessionToken);
  assert.ok(carrier && carrier.email === EMAIL, "session resolves to the carrier");
  log("session token resolves to the carrier");

  // 4) onboarding persists, and survives a "fresh load" (re-read from DB)
  await updateCarrierProfile(carrier!.id, {
    authorityDate: "2025-06-01",
    carrierType: "interstate",
    dotNumber: "3456789",
    legalName: "Smoke Hauling LLC",
  });
  await setMilestoneDone(carrier!.id, "insurance-filings", true);

  const fresh = await prisma.carrier.findUnique({ where: { id: carrier!.id } });
  assert.ok(fresh?.authorityDate, "authority date persisted");
  const states = await getMilestoneStates(carrier!.id);
  const view = buildDashboardView(
    {
      carrierType: "interstate",
      authorityDate: fresh!.authorityDate!.toISOString().slice(0, 10),
      dotNumber: fresh!.dotNumber ?? undefined,
    },
    states
  );
  const ins = view.milestones.find((m) => m.key === "insurance-filings");
  assert.equal(ins?.status, "done", "toggled milestone persisted as done across a fresh load");
  assert.ok(view.nextAction.milestone && view.nextAction.milestone.key !== "insurance-filings", "next action advanced");
  log(`state remembered: ${view.counts.done}/${view.counts.total} done; next = "${view.nextAction.milestone!.title.slice(0, 40)}…"`);

  // 5) entitlement gating: free tier is NOT entitled to the done-for-you
  assert.equal(isEntitled(fresh!), false, "free carrier is not entitled");
  log("free tier correctly gated out of done-for-you");

  // 6) simulate what the Stripe webhook writes on trial start, then re-check entitlement
  await prisma.carrier.update({
    where: { id: carrier!.id },
    data: { subscriptionStatus: "trialing", currentPeriodEnd: new Date(Date.now() + 14 * 86_400_000), stripeCustomerId: "cus_smoke" },
  });
  const paid = await prisma.carrier.findUnique({ where: { id: carrier!.id } });
  assert.equal(isEntitled(paid!), true, "trialing carrier is entitled");
  log("trial unlocks the done-for-you");

  // 7) the work gets done: a pre-filled document from stored state
  const doc = generateDocument("mcs150", {
    legalName: paid!.legalName ?? undefined,
    dotNumber: paid!.dotNumber ?? undefined,
    carrierType: "interstate",
    authorityDate: paid!.authorityDate!.toISOString().slice(0, 10),
  });
  assert.ok(doc.prefilledCount >= 3, "MCS-150 pre-filled from stored profile");
  log(`document prepared: MCS-150 with ${doc.prefilledCount} fields pre-filled`);

  // 8) the loop closes: the reminder sweep runs against live data (email skipped w/o BREVO key,
  //    which rolls the claim back so it can fire once email is configured)
  const summary = await sweepReminders("http://localhost:3000");
  assert.ok(summary.carriers >= 1, "sweep processed the entitled carrier");
  log(`reminder sweep ran: ${JSON.stringify(summary)}`);

  // cleanup
  await prisma.carrier.deleteMany({ where: { email: EMAIL } });
  await prisma.magicLink.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
  console.log("\n✓ closed-loop smoke test PASSED against live Postgres");
}

main().catch(async (err) => {
  console.error("\n✗ smoke test FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
