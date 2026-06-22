"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MilestoneCard } from "@/components/MilestoneCard";
import { ComplianceScore } from "@/components/ComplianceScore";
import type { DashboardView, DashboardMilestone } from "@/lib/carrier-view";
import type { CarrierType } from "@/lib/calendar-engine";

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (yyyymm: string) => MONTH_FMT.format(new Date(yyyymm + "-01T00:00:00Z"));

export function DashboardClient({
  view,
  profile,
}: {
  view: DashboardView;
  profile: { carrierType: CarrierType; authorityDate: string; dotNumber?: string; legalName?: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function toggle(m: DashboardMilestone) {
    const done = m.status !== "done";
    setPending((p) => new Set(p).add(m.key));
    try {
      await fetch("/api/carrier/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneKey: m.key, done }),
      });
      router.refresh(); // re-pull persisted state → recomputes status, score, and the next action
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(m.key);
        return next;
      });
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, DashboardMilestone[]>();
    for (const m of view.milestones) {
      const k = m.dueDate.slice(0, 7);
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    return [...map.entries()];
  }, [view.milestones]);

  const next = view.nextAction.milestone;

  return (
    <section aria-label="Your tracked compliance roadmap" className="space-y-8 pt-2">
      {/* The closed-loop centerpiece: the ONE thing to do next. */}
      <div
        className="card p-6"
        style={{
          borderColor: "var(--color-accent)",
          background: "var(--color-accent-soft)",
        }}
      >
        <p className="eyebrow" style={{ color: "var(--color-accent)" }}>
          {next ? "Your next move" : "All caught up"}
        </p>
        {next ? (
          <>
            <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug">{next.title}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-2)" }}>
              {view.nextAction.reason}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <time className="text-sm font-medium tabular-nums">Due {next.dueDate}</time>
              <span className="cfr">{next.cfrCite}</span>
            </div>
            <button
              onClick={() => toggle(next)}
              className="btn-primary mt-4"
              disabled={pending.has(next.key)}
            >
              {pending.has(next.key) ? "Saving…" : "Mark this done →"}
            </button>
          </>
        ) : (
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug">
            Every milestone is marked done. We&apos;ll keep watching for what&apos;s next.
          </h2>
        )}
      </div>

      {/* Persisted status summary. */}
      <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
        <ComplianceScore score={view.score} />
        <div className="text-right">
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            {profile.legalName ? `${profile.legalName} · ` : ""}
            {profile.carrierType === "interstate" ? "Interstate" : "Intrastate"}
            {profile.dotNumber ? ` · USDOT ${profile.dotNumber}` : ""}
          </p>
          <p className="font-serif text-2xl">
            {view.counts.done}/{view.counts.total} done
          </p>
          <p className="text-sm tabular-nums" style={{ color: "var(--color-muted)" }}>
            {view.counts.overdue} overdue · {view.counts.dueSoon} due soon · authority {profile.authorityDate}
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/documents"
        className="card flex items-center justify-between gap-4 p-5 transition hover:shadow-md"
      >
        <div>
          <p className="font-semibold">Your prepared paperwork</p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-muted)" }}>
            MCS-150, DQF, DVIR log, and your safety-audit binder — pre-filled from your profile.
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium" style={{ color: "var(--color-accent)" }}>
          Open →
        </span>
      </Link>

      <div className="space-y-8">
        {groups.map(([month, items]) => (
          <div key={month}>
            <h3
              className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-muted)" }}
            >
              {monthLabel(month)}
              <span className="h-px flex-1" style={{ background: "var(--color-line)" }} aria-hidden="true" />
            </h3>
            <div className="space-y-3">
              {items.map((m) => (
                <MilestoneCard
                  key={m.key}
                  milestone={m}
                  status={m.status}
                  daysUntil={m.daysUntil}
                  onToggle={() => toggle(m)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        Decision-support, not legal advice — verify against FMCSA. Your progress is saved to your account
        and we&apos;ll email you before deadlines.
      </p>
    </section>
  );
}
