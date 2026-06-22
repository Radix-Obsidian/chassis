// reminders.ts — the "keeps you in the loop" planner. Pure (no DB): given a carrier's current milestone
// view + today, it decides which proactive nudges are due RIGHT NOW and at which stage. The DB-bound sweep
// (reminder-runner.ts) claims each (carrier, milestone, stage) once via a unique key and emails it, so a
// milestone fires once at T-30, once at T-7, once at T-1, and once when it goes overdue — never spam.

import type { MilestoneStatus } from "./calendar-engine";
import { reminderEmail } from "./email-templates";

export type ReminderThreshold = "T-30" | "T-7" | "T-1" | "overdue";

export interface ReminderInput {
  key: string;
  title: string;
  cfrCite: string;
  dueDate: string;
  daysUntil: number;
  status: MilestoneStatus;
}

export interface PlannedReminder {
  milestoneKey: string;
  milestoneTitle: string;
  cfrCite: string;
  dueDate: string;
  daysUntil: number;
  threshold: ReminderThreshold;
  subject: string;
}

// Which stage (if any) applies to an open milestone today. null = nothing to send yet (too far out).
// Exported so the active DomainPack can declare this as its reminder cadence (domain/fmcsa/pack.ts).
export function bucketFor(daysUntil: number): ReminderThreshold | null {
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 1) return "T-1";
  if (daysUntil <= 7) return "T-7";
  if (daysUntil <= 30) return "T-30";
  return null;
}

export function planReminders(milestones: ReminderInput[]): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (const m of milestones) {
    if (m.status === "done") continue;
    const threshold = bucketFor(m.daysUntil);
    if (!threshold) continue;
    // Reuse the email template purely to derive a consistent subject line.
    const { subject } = reminderEmail({
      to: "",
      milestoneTitle: m.title,
      cfrCite: m.cfrCite,
      dueDate: m.dueDate,
      daysUntil: m.daysUntil,
      dashboardUrl: "",
    });
    out.push({
      milestoneKey: m.key,
      milestoneTitle: m.title,
      cfrCite: m.cfrCite,
      dueDate: m.dueDate,
      daysUntil: m.daysUntil,
      threshold,
      subject,
    });
  }
  return out;
}
