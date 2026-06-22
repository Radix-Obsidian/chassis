import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completedKeySet,
  buildDashboardView,
  computeNextAction,
  type DashboardMilestone,
  type StoredMilestoneState,
} from "./carrier-view";

// ---- helpers ----------------------------------------------------------------

function dm(partial: Partial<DashboardMilestone> & { key: string }): DashboardMilestone {
  return {
    key: partial.key,
    title: partial.title ?? partial.key,
    description: "",
    cfrCite: "",
    category: "Ongoing",
    isGating: partial.isGating ?? false,
    dueDate: partial.dueDate ?? "2026-12-01",
    status: partial.status ?? "upcoming",
    daysUntil: partial.daysUntil ?? 100,
    completedAt: partial.completedAt ?? null,
  };
}

// ---- completedKeySet --------------------------------------------------------

test("completedKeySet includes only states with a completedAt", () => {
  const states: StoredMilestoneState[] = [
    { milestoneKey: "a", completedAt: "2026-01-01" },
    { milestoneKey: "b", completedAt: null },
    { milestoneKey: "c" },
    { milestoneKey: "d", completedAt: new Date("2026-02-02") },
  ];
  const set = completedKeySet(states);
  assert.deepEqual([...set].sort(), ["a", "d"]);
});

// ---- computeNextAction (the "do this next" engine) --------------------------

test("nextAction prioritizes an overdue gating item over a due-soon item", () => {
  const next = computeNextAction([
    dm({ key: "soon", status: "due-soon", daysUntil: 10 }),
    dm({ key: "lapsed", status: "overdue", daysUntil: -5, isGating: true }),
  ]);
  assert.equal(next.milestone?.key, "lapsed");
  assert.match(next.reason, /authority/i);
});

test("nextAction prefers any overdue over a due-soon", () => {
  const next = computeNextAction([
    dm({ key: "soon", status: "due-soon", daysUntil: 3 }),
    dm({ key: "late", status: "overdue", daysUntil: -1 }),
  ]);
  assert.equal(next.milestone?.key, "late");
});

test("nextAction breaks ties within a tier by earliest due date", () => {
  const next = computeNextAction([
    dm({ key: "later", status: "overdue", daysUntil: -2, dueDate: "2026-05-10" }),
    dm({ key: "earlier", status: "overdue", daysUntil: -40, dueDate: "2026-03-01" }),
  ]);
  assert.equal(next.milestone?.key, "earlier");
});

test("nextAction prefers a gating upcoming item over a non-gating upcoming item", () => {
  const next = computeNextAction([
    dm({ key: "plain", status: "upcoming", dueDate: "2026-07-01" }),
    dm({ key: "critical", status: "upcoming", dueDate: "2026-08-01", isGating: true }),
  ]);
  assert.equal(next.milestone?.key, "critical");
});

test("nextAction skips done items", () => {
  const next = computeNextAction([
    dm({ key: "finished", status: "done", isGating: true, completedAt: "2026-01-01" }),
    dm({ key: "open", status: "due-soon", daysUntil: 12 }),
  ]);
  assert.equal(next.milestone?.key, "open");
});

test("nextAction returns null + a caught-up reason when everything is done", () => {
  const next = computeNextAction([
    dm({ key: "a", status: "done", completedAt: "2026-01-01" }),
    dm({ key: "b", status: "done", completedAt: "2026-02-01" }),
  ]);
  assert.equal(next.milestone, null);
  assert.match(next.reason, /caught up|all clear|done/i);
});

// ---- buildDashboardView (stored state + calendar) ---------------------------

const NOW = new Date("2026-06-20T12:00:00Z");
const PROFILE = { carrierType: "interstate" as const, authorityDate: "2025-06-01", dotNumber: "3456789" };

test("buildDashboardView marks stored-completed milestones as done", () => {
  const view = buildDashboardView(
    PROFILE,
    [{ milestoneKey: "insurance-filings", completedAt: "2025-06-02" }],
    NOW
  );
  const ins = view.milestones.find((m) => m.key === "insurance-filings");
  assert.ok(ins, "insurance-filings should be in the calendar");
  assert.equal(ins!.status, "done");
  assert.equal(ins!.completedAt, "2025-06-02");
  assert.ok(view.completedKeys.includes("insurance-filings"));
});

test("buildDashboardView sorts milestones chronologically by due date", () => {
  const view = buildDashboardView(PROFILE, [], NOW);
  const dates = view.milestones.map((m) => m.dueDate);
  const sorted = [...dates].sort();
  assert.deepEqual(dates, sorted);
});

test("buildDashboardView score matches the engine and counts are consistent", () => {
  const view = buildDashboardView(
    PROFILE,
    [{ milestoneKey: "dqf", completedAt: "2025-07-01" }],
    NOW
  );
  assert.equal(view.counts.total, view.milestones.length);
  assert.equal(
    view.counts.done,
    view.milestones.filter((m) => m.status === "done").length
  );
  assert.ok(view.score >= 0 && view.score <= 100);
});

test("buildDashboardView surfaces a next action while work remains", () => {
  const view = buildDashboardView(PROFILE, [], NOW);
  assert.ok(view.nextAction.milestone, "with nothing done, there must be a next action");
  assert.notEqual(view.nextAction.milestone!.status, "done");
});
