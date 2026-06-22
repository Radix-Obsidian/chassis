// reminder-runner.ts — the DB-bound sweep behind the cron. For every carrier with a roadmap, it recomputes
// their live milestone state, asks the pure planner what's due today, then CLAIMS each (carrier, milestone,
// stage) slot via the unique key before sending — so running the cron hourly or daily never double-sends.
//
// Idempotent and fail-safe: a claim that already exists is skipped; with no BREVO_API_KEY the claim is
// rolled back so it can fire once email is configured; a send error marks the row failed (not sent).

import { prisma } from "./db";
import { buildDashboardView } from "./carrier-view";
import { planReminders, type ReminderInput } from "./reminders";
import { sendEmail } from "./email";
import { reminderEmail } from "./email-templates";
import { isEntitled } from "./subscription";
import type { CarrierType } from "./calendar-engine";

export interface SweepSummary {
  carriers: number;
  planned: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function sweepReminders(
  origin: string,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env
): Promise<SweepSummary> {
  const summary: SweepSummary = { carriers: 0, planned: 0, sent: 0, skipped: 0, failed: 0 };

  const carriers = await prisma.carrier.findMany({
    where: { authorityDate: { not: null } },
    include: { milestoneStates: true },
  });

  for (const carrier of carriers) {
    // Reminders are a paid (done-for-you) feature — only entitled carriers get proactive nudges.
    if (!isEntitled(carrier)) continue;
    summary.carriers++;
    const profile = {
      carrierType: (carrier.carrierType as CarrierType) ?? "interstate",
      authorityDate: carrier.authorityDate!.toISOString().slice(0, 10),
      dotNumber: carrier.dotNumber ?? undefined,
    };
    const view = buildDashboardView(
      profile,
      carrier.milestoneStates.map((s) => ({ milestoneKey: s.milestoneKey, completedAt: s.completedAt })),
      now
    );
    const inputs: ReminderInput[] = view.milestones.map((m) => ({
      key: m.key,
      title: m.title,
      cfrCite: m.cfrCite,
      dueDate: m.dueDate,
      daysUntil: m.daysUntil,
      status: m.status,
    }));
    const planned = planReminders(inputs);
    summary.planned += planned.length;

    for (const r of planned) {
      // claim the slot; a duplicate means this stage already went out for this milestone.
      let claimId: string;
      try {
        const created = await prisma.reminder.create({
          data: {
            carrierId: carrier.id,
            milestoneKey: r.milestoneKey,
            threshold: r.threshold,
            subject: r.subject,
            sendAt: now,
            status: "pending",
          },
        });
        claimId = created.id;
      } catch (err: unknown) {
        if ((err as { code?: string }).code === "P2002") {
          summary.skipped++;
          continue;
        }
        throw err;
      }

      try {
        const res = await sendEmail(
          reminderEmail({
            to: carrier.email,
            milestoneTitle: r.milestoneTitle,
            cfrCite: r.cfrCite,
            dueDate: r.dueDate,
            daysUntil: r.daysUntil,
            dashboardUrl: `${origin}/dashboard`,
          }),
          env
        );
        if (res.skipped) {
          // email not configured — roll back the claim so it can fire later, once a key exists.
          await prisma.reminder.delete({ where: { id: claimId } });
          summary.skipped++;
        } else {
          await prisma.reminder.update({ where: { id: claimId }, data: { status: "sent", sentAt: now } });
          summary.sent++;
        }
      } catch (err) {
        console.error(`[reminders] send failed for ${carrier.email} / ${r.milestoneKey}:`, err);
        await prisma.reminder.update({ where: { id: claimId }, data: { status: "failed" } });
        summary.failed++;
      }
    }
  }

  return summary;
}
