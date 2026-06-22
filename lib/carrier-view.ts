// carrier-view.ts — turns persisted state into what the dashboard shows. Pure (no DB import) so it
// unit-tests freely; the DB layer feeds it plain rows.
//
// This is where "informs" becomes "co-pilots": on top of the deterministic calendar we layer the
// carrier's REMEMBERED completion state, then compute the ONE next action they should take. The
// next-action engine is the seed of the closed loop — the product deciding for them, not just listing.

import {
  generateCalendar,
  milestoneStatus,
  complianceScore,
  auditWindow,
  daysUntil,
  type CarrierType,
  type Milestone,
  type MilestoneStatus,
} from "./calendar-engine";

export interface StoredCarrierProfile {
  carrierType: CarrierType;
  authorityDate: string; // ISO YYYY-MM-DD
  dotNumber?: string;
}

export interface StoredMilestoneState {
  milestoneKey: string;
  completedAt?: string | Date | null;
}

export interface DashboardMilestone extends Milestone {
  status: MilestoneStatus;
  daysUntil: number;
  completedAt: string | null;
}

export interface NextAction {
  milestone: DashboardMilestone | null;
  reason: string;
}

export interface DashboardView {
  milestones: DashboardMilestone[];
  completedKeys: string[];
  score: number;
  audit: { milestone: Milestone; daysUntil: number } | null;
  nextAction: NextAction;
  counts: { total: number; done: number; overdue: number; dueSoon: number; upcoming: number };
}

const toISODate = (v: string | Date): string =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v.slice(0, 10);

export function completedKeySet(states: StoredMilestoneState[]): Set<string> {
  const set = new Set<string>();
  for (const s of states) if (s.completedAt) set.add(s.milestoneKey);
  return set;
}

// Priority tiers for "what should I do next" — lower number = more urgent. The closed-loop decision.
function actionPriority(m: DashboardMilestone): number {
  if (m.status === "done") return Number.POSITIVE_INFINITY;
  if (m.status === "overdue") return m.isGating ? 0 : 1;
  if (m.status === "due-soon") return m.isGating ? 2 : 3;
  return m.isGating ? 4 : 5; // upcoming
}

const REASONS: Record<number, string> = {
  0: "Overdue and puts your operating authority at risk — handle this first.",
  1: "Overdue — close this out to get back on track.",
  2: "Due within 30 days and authority-critical — prioritize it.",
  3: "Due within the next 30 days.",
  4: "Your next authority-critical milestone.",
  5: "Your next milestone to stay ahead of.",
};

export function computeNextAction(milestones: DashboardMilestone[]): NextAction {
  let best: DashboardMilestone | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const m of milestones) {
    const p = actionPriority(m);
    if (p === Number.POSITIVE_INFINITY) continue;
    // lower priority wins; tie broken by earlier due date
    if (p < bestPriority || (p === bestPriority && best !== null && m.dueDate < best.dueDate)) {
      best = m;
      bestPriority = p;
    }
  }
  if (!best) return { milestone: null, reason: "All clear — you're caught up on every milestone." };
  return { milestone: best, reason: REASONS[bestPriority] ?? "Your next milestone to stay ahead of." };
}

export function buildDashboardView(
  profile: StoredCarrierProfile,
  states: StoredMilestoneState[],
  now: Date = new Date()
): DashboardView {
  const authority = new Date(profile.authorityDate + "T00:00:00Z");
  const calendar = generateCalendar(
    { carrierType: profile.carrierType, dotNumber: profile.dotNumber },
    authority
  );
  const completed = completedKeySet(states);
  const completedAtByKey = new Map<string, string>();
  for (const s of states) if (s.completedAt) completedAtByKey.set(s.milestoneKey, toISODate(s.completedAt));

  const milestones: DashboardMilestone[] = calendar.map((m) => ({
    ...m,
    status: milestoneStatus(m, completed, now),
    daysUntil: daysUntil(m.dueDate, now),
    completedAt: completedAtByKey.get(m.key) ?? null,
  }));

  const counts = {
    total: milestones.length,
    done: milestones.filter((m) => m.status === "done").length,
    overdue: milestones.filter((m) => m.status === "overdue").length,
    dueSoon: milestones.filter((m) => m.status === "due-soon").length,
    upcoming: milestones.filter((m) => m.status === "upcoming").length,
  };

  return {
    milestones,
    completedKeys: [...completed],
    score: complianceScore(calendar, completed),
    audit: auditWindow(calendar, now),
    nextAction: computeNextAction(milestones),
    counts,
  };
}
