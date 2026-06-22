// calendar-engine.ts — the product's zero-to-one core. Deterministic, pure TypeScript, NO AI.
// Given a carrier profile + the date FMCSA authority was granted, it produces the personalized,
// chronologically-sequenced 18-month new-entrant compliance calendar. The milestone ruleset is a
// static reading of the federal regulations (49 CFR Parts 382, 385, 387, 390, 391, 395, 396); dates
// are computed by offsetting CFR-mandated windows from the authority date. No I/O, fully unit-testable.
//
// IMPORTANT (honesty): this is decision-support, not legal advice; windows are the common federal
// minimums for a new entrant. State (intrastate) programs and edge cases vary — the UI says so.

export type CarrierType = "interstate" | "intrastate";

export interface CarrierProfile {
  dotNumber?: string;
  carrierType: CarrierType;
  state?: string;
}

export type MilestoneCategory =
  | "Registration & Insurance"
  | "Drug & Alcohol"
  | "Records & Files"
  | "Safety Audit"
  | "Ongoing";

interface MilestoneDef {
  key: string;
  title: string;
  description: string;
  cfrCite: string;
  category: MilestoneCategory;
  offsetDays: number; // days after the authority date the obligation is due / window opens
  isGating: boolean; // failure puts operating authority at risk (the audit, core registrations)
  appliesTo: "all" | "interstate"; // intrastate new entrants follow state programs for interstate-only items
}

export interface Milestone {
  key: string;
  title: string;
  description: string;
  cfrCite: string;
  category: MilestoneCategory;
  isGating: boolean;
  dueDate: string; // ISO YYYY-MM-DD
}

export type MilestoneStatus = "done" | "overdue" | "due-soon" | "upcoming";

const DAY_MS = 86_400_000;
const DUE_SOON_DAYS = 30;

// The federal new-entrant ruleset. Offsets are conservative readings of the CFR windows; the
// New Entrant Safety Audit is scheduled by FMCSA within the first 12 months — we surface a prep
// window at month ~11 (the conversion hook), and the 18-month program completion at the end.
const MILESTONE_DEFS: MilestoneDef[] = [
  {
    key: "insurance-filings",
    title: "File proof of insurance (BMC-91/91X) & designate a process agent (BOC-3)",
    description:
      "Operating authority is not active until your insurer files proof of financial responsibility and you have a BOC-3 process agent on file. Do this before hauling a single load.",
    cfrCite: "49 CFR 387 / 366",
    category: "Registration & Insurance",
    offsetDays: 0,
    isGating: true,
    appliesTo: "all",
  },
  {
    key: "ucr-registration",
    title: "Register & pay Unified Carrier Registration (UCR)",
    description:
      "Interstate carriers must register and pay the annual UCR fee. Driving interstate without it risks roadside out-of-service orders.",
    cfrCite: "UCR Act / 49 CFR 367",
    category: "Registration & Insurance",
    offsetDays: 0,
    isGating: false,
    appliesTo: "interstate",
  },
  {
    key: "da-consortium",
    title: "Enroll in a drug & alcohol testing consortium (C/TPA)",
    description:
      "Before ANY driver operates a CMV, you must have a DOT drug & alcohol testing program — join a consortium/third-party administrator and set up your random testing pool.",
    cfrCite: "49 CFR 382.305 / 382.301",
    category: "Drug & Alcohol",
    offsetDays: 0,
    isGating: true,
    appliesTo: "all",
  },
  {
    key: "clearinghouse-register",
    title: "Register with the FMCSA Drug & Alcohol Clearinghouse",
    description:
      "Register your company in the Clearinghouse so you can run pre-employment full queries and report violations. Required before you can lawfully use a driver.",
    cfrCite: "49 CFR 382 Subpart G",
    category: "Drug & Alcohol",
    offsetDays: 0,
    isGating: true,
    appliesTo: "all",
  },
  {
    key: "pre-employment-test",
    title: "Run a pre-employment drug test for every driver",
    description:
      "Each driver must pass a pre-employment drug test AND have a pre-employment Clearinghouse full query before performing safety-sensitive functions.",
    cfrCite: "49 CFR 382.301",
    category: "Drug & Alcohol",
    offsetDays: 3,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "eld-hos",
    title: "Put ELD + Hours-of-Service recordkeeping in place",
    description:
      "Install a registered ELD and start retaining Hours-of-Service records. HOS and ELD records are a top item the safety audit checks.",
    cfrCite: "49 CFR 395",
    category: "Records & Files",
    offsetDays: 7,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "dqf",
    title: "Build a Driver Qualification File (DQF) for each driver",
    description:
      "Assemble the DQF: application, MVR, road test or CDL equivalency, medical certificate, and the annual review of driving record.",
    cfrCite: "49 CFR 391.51",
    category: "Records & Files",
    offsetDays: 14,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "maintenance-records",
    title: "Set up vehicle maintenance files, DVIRs & annual inspection",
    description:
      "Keep a maintenance file per vehicle, collect Driver Vehicle Inspection Reports, and schedule the required annual periodic inspection.",
    cfrCite: "49 CFR 396",
    category: "Records & Files",
    offsetDays: 30,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "random-testing-rate",
    title: "Confirm your random drug/alcohol testing is hitting required rates",
    description:
      "Your consortium must conduct random testing at the annual minimum rates. Check mid-year that selections are actually being made and documented.",
    cfrCite: "49 CFR 382.305",
    category: "Drug & Alcohol",
    offsetDays: 180,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "safety-audit-window",
    title: "New Entrant Safety Audit — prepare your audit packet NOW",
    description:
      "FMCSA conducts a mandatory safety audit within your first 12 months. This is the make-or-break milestone: a failed audit can revoke your new-entrant registration. Have every record above audit-ready.",
    cfrCite: "49 CFR 385 Subpart D",
    category: "Safety Audit",
    offsetDays: 330,
    isGating: true,
    appliesTo: "interstate",
  },
  {
    key: "annual-clearinghouse-query",
    title: "Run the annual Clearinghouse query for every driver",
    description:
      "Once a year you must run a Clearinghouse query on each driver you employ. Missing the annual query is a common, avoidable violation.",
    cfrCite: "49 CFR 382.701",
    category: "Ongoing",
    offsetDays: 365,
    isGating: false,
    appliesTo: "all",
  },
  {
    key: "program-completion",
    title: "Complete the 18-month new-entrant monitoring period",
    description:
      "Pass your safety audit and maintain compliance through 18 months and FMCSA grants permanent registration. This is the finish line.",
    cfrCite: "49 CFR 385 Subpart D",
    category: "Safety Audit",
    offsetDays: 547,
    isGating: true,
    appliesTo: "all",
  },
];

// Deterministic date math in UTC (no timezone drift). Returns YYYY-MM-DD.
export function addDaysISO(start: Date, days: number): string {
  const ms = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()) + days * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

// The core: profile + authority date → personalized, chronologically-sorted milestone calendar.
export function generateCalendar(profile: CarrierProfile, authorityDate: Date): Milestone[] {
  if (!(authorityDate instanceof Date) || Number.isNaN(authorityDate.getTime())) {
    throw new Error("generateCalendar: a valid authorityDate is required");
  }
  const applicable = MILESTONE_DEFS.filter(
    (d) => d.appliesTo === "all" || profile.carrierType === "interstate"
  );
  return applicable
    .map((d) => ({
      key: d.key,
      title: d.title,
      description: d.description,
      cfrCite: d.cfrCite,
      category: d.category,
      isGating: d.isGating,
      dueDate: addDaysISO(authorityDate, d.offsetDays),
    }))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}

export function daysUntil(dueDate: string, now: Date = new Date()): number {
  const due = Date.parse(dueDate + "T00:00:00Z");
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / DAY_MS);
}

export function milestoneStatus(
  m: Milestone,
  completedKeys: ReadonlySet<string>,
  now: Date = new Date()
): MilestoneStatus {
  if (completedKeys.has(m.key)) return "done";
  const d = daysUntil(m.dueDate, now);
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "due-soon";
  return "upcoming";
}

// Compliance score = share of NON-GATING milestones completed (gating items are pass/fail, tracked
// separately by the countdown). Returns 0..100, integer. Empty calendar → 0.
export function complianceScore(milestones: Milestone[], completedKeys: ReadonlySet<string>): number {
  const scored = milestones.filter((m) => !m.isGating);
  if (!scored.length) return 0;
  const done = scored.filter((m) => completedKeys.has(m.key)).length;
  return Math.round((done / scored.length) * 100);
}

// The conversion hook: the gating safety-audit window + how long until it. null if not applicable
// (e.g., an intrastate carrier whose audit is a state program we don't sequence in v1).
export function auditWindow(
  milestones: Milestone[],
  now: Date = new Date()
): { milestone: Milestone; daysUntil: number } | null {
  const audit = milestones.find((m) => m.key === "safety-audit-window");
  if (!audit) return null;
  return { milestone: audit, daysUntil: daysUntil(audit.dueDate, now) };
}
