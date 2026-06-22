// Unit tests for the calendar engine — the IP. Pure function, no mocks. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  generateCalendar,
  addDaysISO,
  daysUntil,
  milestoneStatus,
  complianceScore,
  auditWindow,
  type Milestone,
} from "./calendar-engine.ts";

const AUTH = new Date("2026-01-15T00:00:00Z");

test("addDaysISO — deterministic UTC date math, incl. year boundary", () => {
  assert.equal(addDaysISO(new Date("2026-12-20T00:00:00Z"), 30), "2027-01-19");
  assert.equal(addDaysISO(AUTH, 0), "2026-01-15");
  assert.equal(addDaysISO(AUTH, 365), "2027-01-15");
});

test("generateCalendar — interstate gets the full set incl. the new-entrant safety audit", () => {
  const cal = generateCalendar({ carrierType: "interstate" }, AUTH);
  const keys = cal.map((m) => m.key);
  assert.ok(keys.includes("safety-audit-window"), "interstate must include the safety audit");
  assert.ok(keys.includes("ucr-registration"), "interstate must include UCR");
  assert.ok(keys.includes("da-consortium"));
  assert.ok(cal.length >= 11);
});

test("generateCalendar — intrastate drops interstate-only items (UCR, federal new-entrant audit)", () => {
  const cal = generateCalendar({ carrierType: "intrastate" }, AUTH);
  const keys = cal.map((m) => m.key);
  assert.equal(keys.includes("ucr-registration"), false, "intrastate excludes UCR");
  assert.equal(keys.includes("safety-audit-window"), false, "intrastate excludes the federal audit window");
  assert.ok(keys.includes("da-consortium"), "intrastate still gets federal drug/alcohol obligations");
  assert.ok(keys.includes("clearinghouse-register"));
});

test("generateCalendar — milestones are chronologically sorted with dates offset from authority", () => {
  const cal = generateCalendar({ carrierType: "interstate" }, AUTH);
  for (let i = 1; i < cal.length; i++) {
    assert.ok(cal[i - 1].dueDate <= cal[i].dueDate, "must be sorted ascending by dueDate");
  }
  const audit = cal.find((m) => m.key === "safety-audit-window")!;
  assert.equal(audit.dueDate, addDaysISO(AUTH, 330)); // ~11 months
  const done = cal.find((m) => m.key === "program-completion")!;
  assert.equal(done.dueDate, addDaysISO(AUTH, 547)); // ~18 months
});

test("generateCalendar — every milestone carries a real CFR citation", () => {
  const cal = generateCalendar({ carrierType: "interstate" }, AUTH);
  for (const m of cal) assert.match(m.cfrCite, /49 CFR|UCR/, `${m.key} must cite a regulation`);
});

test("generateCalendar — rejects an invalid authority date (fail-fast)", () => {
  assert.throws(() => generateCalendar({ carrierType: "interstate" }, new Date("not-a-date")), /authorityDate/);
});

test("daysUntil — signed day delta in UTC", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  assert.equal(daysUntil("2026-01-25", now), 10);
  assert.equal(daysUntil("2026-01-05", now), -10);
});

test("milestoneStatus — done / overdue / due-soon / upcoming", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const m = (key: string, dueDate: string): Milestone => ({
    key, dueDate, title: "", description: "", cfrCite: "", category: "Records & Files", isGating: false,
  });
  assert.equal(milestoneStatus(m("a", "2026-12-01"), new Set(["a"]), now), "done");
  assert.equal(milestoneStatus(m("b", "2026-05-01"), new Set(), now), "overdue");
  assert.equal(milestoneStatus(m("c", "2026-06-20"), new Set(), now), "due-soon");
  assert.equal(milestoneStatus(m("d", "2026-12-01"), new Set(), now), "upcoming");
});

test("complianceScore — share of NON-GATING milestones completed", () => {
  const cal = generateCalendar({ carrierType: "interstate" }, AUTH);
  assert.equal(complianceScore(cal, new Set()), 0);
  const nonGating = cal.filter((m) => !m.isGating).map((m) => m.key);
  assert.equal(complianceScore(cal, new Set(nonGating)), 100);
  const half = new Set(nonGating.slice(0, Math.floor(nonGating.length / 2)));
  const score = complianceScore(cal, half);
  assert.ok(score > 0 && score < 100);
  assert.equal(complianceScore([], new Set()), 0); // empty → 0, never NaN
});

test("auditWindow — returns the gating audit + days-until for interstate; null for intrastate", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const inter = auditWindow(generateCalendar({ carrierType: "interstate" }, AUTH), now);
  assert.ok(inter);
  assert.equal(inter!.milestone.key, "safety-audit-window");
  assert.equal(inter!.daysUntil, 330);
  assert.equal(auditWindow(generateCalendar({ carrierType: "intrastate" }, AUTH), now), null);
});
