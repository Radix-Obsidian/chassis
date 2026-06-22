import Link from "next/link";
import { generateCalendar, auditWindow } from "@/lib/calendar-engine";
import type { EntitlementClaims } from "@/lib/entitlement";
import { AUDIT_SECTIONS } from "@/lib/audit-sections";
import { PrintButton } from "@/components/PrintButton";

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmt = (iso: string) => DATE_FMT.format(new Date(iso + "T00:00:00Z"));

// The PAID artifact: a personalized, dated, CFR-cited new-entrant audit packet, rendered server-side
// from the verified entitlement claims (no DB — reproducible from the token). Print-optimized.
export function FullPacket({ claims }: { claims: EntitlementClaims }) {
  const authority = new Date(claims.authorityDate + "T00:00:00Z");
  const calendar = generateCalendar({ dotNumber: claims.dotNumber, carrierType: claims.carrierType }, authority);
  const audit = auditWindow(calendar);

  return (
    <div className="packet-page mx-auto max-w-4xl px-6 py-10">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/navigator" className="text-sm font-medium hover:underline">
          ← Back to navigator
        </Link>
        <PrintButton />
      </div>

      <header className="border-b pb-6" style={{ borderColor: "var(--color-line)" }}>
        <span className="eyebrow">FMCSA New-Entrant · Audit-ready packet</span>
        <h1 className="mt-2 font-serif text-4xl">Your safety-audit packet</h1>
        <p className="mt-2 cfr">
          {claims.carrierType === "interstate" ? "Interstate" : "Intrastate"} carrier
          {claims.dotNumber ? ` · USDOT ${claims.dotNumber}` : ""} · authority granted {fmt(claims.authorityDate)}
        </p>
        <p className="no-print mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
          Unlocked. Bookmark this page — it stays available. Covered by our 30-day money-back guarantee.
        </p>
      </header>

      {audit && (
        <section className="card mt-6 p-5" style={{ borderColor: "var(--color-red)" }}>
          <span className="stamp">⚠ Make-or-break</span>
          <h2 className="mt-2 font-serif text-xl">New-Entrant Safety Audit — due by {fmt(audit.milestone.dueDate)}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {audit.milestone.description}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Your dated compliance roadmap</h2>
        <ol className="mt-4 space-y-3">
          {calendar.map((m) => (
            <li key={m.key} className="card flex items-start gap-4 p-4">
              <time className="cfr whitespace-nowrap pt-0.5">{fmt(m.dueDate)}</time>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  {m.isGating && (
                    <span className="badge" style={{ borderColor: "var(--color-red)", color: "var(--color-red)" }}>
                      Gating
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                  {m.description}
                </p>
                <span className="cfr">{m.cfrCite}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">What the auditor will ask for</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          Gather these records, organized by regulation.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {AUDIT_SECTIONS.map((s) => (
            <div key={s.title} className="card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{s.title}</h3>
                <span className="cfr">{s.cfr}</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {s.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--color-red)" }}
                      aria-hidden="true"
                    />
                    <span style={{ color: "var(--color-muted)" }}>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t pt-6 text-sm" style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}>
        Decision-support, not legal advice — verify against FMCSA. Windows are the common federal minimums for a new
        entrant; state (intrastate) programs and edge cases vary. A product of The Native Factory.
      </footer>
    </div>
  );
}
