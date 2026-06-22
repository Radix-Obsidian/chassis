"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  generateCalendar,
  complianceScore,
  auditWindow,
  milestoneStatus,
  daysUntil,
  type CarrierType,
  type Milestone,
} from "@/lib/calendar-engine";
import { MilestoneCard } from "@/components/MilestoneCard";
import { CountdownBanner } from "@/components/CountdownBanner";
import { ComplianceScore } from "@/components/ComplianceScore";
import { AuditPacketPreview } from "@/components/AuditPacketPreview";

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthLabel = (iso: string) => MONTH_FMT.format(new Date(iso + "T00:00:00Z"));

export default function Navigator() {
  const [step, setStep] = useState<"entry" | "dashboard">("entry");
  const [dotNumber, setDotNumber] = useState("");
  const [authorityDate, setAuthorityDate] = useState("");
  const [carrierType, setCarrierType] = useState<CarrierType>("interstate");
  const [error, setError] = useState("");

  const [calendar, setCalendar] = useState<Milestone[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showAudit, setShowAudit] = useState(false);

  const now = useMemo(() => new Date(), []);

  function loadSample() {
    const d = new Date(Date.now() - 340 * 86_400_000).toISOString().slice(0, 10);
    setDotNumber("3456789");
    setAuthorityDate(d);
    setCarrierType("interstate");
    setError("");
  }

  function generate() {
    if (!authorityDate) {
      setError("Enter the date your FMCSA authority was granted.");
      return;
    }
    const date = new Date(authorityDate + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) {
      setError("That date isn't valid.");
      return;
    }
    setError("");
    setCalendar(generateCalendar({ dotNumber: dotNumber || undefined, carrierType }, date));
    setCompleted(new Set());
    setStep("dashboard");
  }

  function toggle(key: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const score = complianceScore(calendar, completed);
  const audit = auditWindow(calendar, now);

  // chronological timeline grouped by month
  const groups = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of calendar) {
      const k = m.dueDate.slice(0, 7);
      (map.get(k) ?? map.set(k, []).get(k)!).push(m);
    }
    return [...map.entries()];
  }, [calendar]);

  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-lg font-semibold">
          DOT Navigator<span style={{ color: "var(--color-accent)" }}>.</span>
        </Link>
        <div className="flex items-center gap-4">
          {step === "dashboard" && (
            <button onClick={() => setStep("entry")} className="text-sm font-medium hover:underline">
              ← Edit carrier
            </button>
          )}
          <Link
            href="/signin"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            Save my progress →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {step === "entry" ? (
          <section aria-labelledby="entry-h" className="mx-auto max-w-xl pt-8">
            <h1 id="entry-h" className="font-serif font-semibold" style={{ fontSize: "var(--text-h2)" }}>
              Tell us about your authority
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
              We&apos;ll anchor your entire 18-month compliance calendar to the date FMCSA granted it.
            </p>

            <div className="card mt-6 space-y-5 p-6">
              <div>
                <label htmlFor="dot" className="mb-1.5 block text-sm font-medium">
                  USDOT number <span style={{ color: "var(--color-muted)" }}>(optional in preview)</span>
                </label>
                <input id="dot" className="field" inputMode="numeric" placeholder="e.g. 3456789" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} />
              </div>

              <div>
                <label htmlFor="auth" className="mb-1.5 block text-sm font-medium">
                  Date authority was granted
                </label>
                <input id="auth" type="date" className="field" value={authorityDate} onChange={(e) => setAuthorityDate(e.target.value)} />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">Operation type</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["interstate", "intrastate"] as CarrierType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCarrierType(t)}
                      aria-pressed={carrierType === t}
                      className="rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition"
                      style={{
                        borderColor: carrierType === t ? "var(--color-accent)" : "var(--color-line)",
                        background: carrierType === t ? "var(--color-accent-soft)" : "transparent",
                        color: carrierType === t ? "var(--color-accent)" : "var(--color-ink)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium" role="alert" style={{ color: "var(--color-accent)" }}>
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button onClick={loadSample} className="text-sm font-medium hover:underline" style={{ color: "var(--color-muted)" }}>
                  Try a sample carrier
                </button>
                <button onClick={generate} className="btn-primary">
                  Generate my roadmap →
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section aria-label="Your compliance roadmap" className="space-y-8 pt-4">
            <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
              <ComplianceScore score={score} />
              <div className="text-right">
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  {carrierType === "interstate" ? "Interstate" : "Intrastate"} carrier
                  {dotNumber ? ` · USDOT ${dotNumber}` : ""}
                </p>
                <p className="font-serif text-2xl">{calendar.length} milestones</p>
                <p className="text-sm tabular-nums" style={{ color: "var(--color-muted)" }}>
                  {completed.size} done · authority {authorityDate}
                </p>
              </div>
            </div>

            {audit && <CountdownBanner daysUntil={audit.daysUntil} dueDate={audit.milestone.dueDate} onPrep={() => setShowAudit(true)} />}

            {showAudit && (
              <AuditPacketPreview
                onClose={() => setShowAudit(false)}
                inputs={{ carrierType, authorityDate, dotNumber: dotNumber || undefined }}
              />
            )}

            <div className="space-y-8">
              {groups.map(([month, items]) => (
                <div key={month}>
                  <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
                    {monthLabel(month + "-01")}
                    <span className="h-px flex-1" style={{ background: "var(--color-line)" }} aria-hidden="true" />
                  </h2>
                  <div className="space-y-3">
                    {items.map((m) => (
                      <MilestoneCard
                        key={m.key}
                        milestone={m}
                        status={milestoneStatus(m, completed, now)}
                        daysUntil={daysUntil(m.dueDate, now)}
                        onToggle={() => toggle(m.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Decision-support, not legal advice — verify against FMCSA. The calendar is free; the full audit-ready packet is a one-time unlock.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
