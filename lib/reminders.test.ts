import { test } from "node:test";
import assert from "node:assert/strict";
import { planReminders, type ReminderInput } from "./reminders";

function m(partial: Partial<ReminderInput> & { key: string }): ReminderInput {
  return {
    key: partial.key,
    title: partial.title ?? partial.key,
    cfrCite: partial.cfrCite ?? "49 CFR 000",
    dueDate: partial.dueDate ?? "2026-12-01",
    daysUntil: partial.daysUntil ?? 100,
    status: partial.status ?? "upcoming",
  };
}

test("a milestone far out (>30 days) yields no reminder", () => {
  const out = planReminders([m({ key: "far", daysUntil: 60, status: "upcoming" })]);
  assert.equal(out.length, 0);
});

test("buckets map daysUntil to the right threshold", () => {
  const out = planReminders([
    m({ key: "a", daysUntil: 25, status: "due-soon" }),
    m({ key: "b", daysUntil: 5, status: "due-soon" }),
    m({ key: "c", daysUntil: 1, status: "due-soon" }),
    m({ key: "d", daysUntil: -3, status: "overdue" }),
  ]);
  const byKey = Object.fromEntries(out.map((r) => [r.milestoneKey, r.threshold]));
  assert.equal(byKey["a"], "T-30");
  assert.equal(byKey["b"], "T-7");
  assert.equal(byKey["c"], "T-1");
  assert.equal(byKey["d"], "overdue");
});

test("boundaries: 30 → T-30, 7 → T-7, 0 → T-1", () => {
  const out = planReminders([
    m({ key: "e30", daysUntil: 30, status: "due-soon" }),
    m({ key: "e7", daysUntil: 7, status: "due-soon" }),
    m({ key: "e0", daysUntil: 0, status: "due-soon" }),
  ]);
  const byKey = Object.fromEntries(out.map((r) => [r.milestoneKey, r.threshold]));
  assert.equal(byKey["e30"], "T-30");
  assert.equal(byKey["e7"], "T-7");
  assert.equal(byKey["e0"], "T-1");
});

test("done milestones never produce reminders", () => {
  const out = planReminders([m({ key: "done", daysUntil: 2, status: "done" })]);
  assert.equal(out.length, 0);
});

test("each planned reminder carries the data the email needs", () => {
  const [r] = planReminders([
    m({ key: "x", title: "Renew UCR", cfrCite: "49 CFR 367", dueDate: "2026-07-01", daysUntil: 6, status: "due-soon" }),
  ]);
  assert.equal(r.milestoneKey, "x");
  assert.equal(r.milestoneTitle, "Renew UCR");
  assert.equal(r.cfrCite, "49 CFR 367");
  assert.equal(r.dueDate, "2026-07-01");
  assert.equal(r.daysUntil, 6);
  assert.equal(r.threshold, "T-7");
  assert.ok(r.subject.length > 0);
});
