import Link from "next/link";
import { ComplianceSpine } from "@/components/ComplianceSpine";

const STATS = [
  { n: "30,000+", label: "carriers register with FMCSA each year" },
  { n: "12 mo.", label: "until your mandatory new-entrant safety audit" },
  { n: "Revoked", label: "what a failed audit does to your authority" },
];

const STEPS = [
  { k: "01", t: "Enter your USDOT & authority date", d: "The day FMCSA issued your number started an 18-month federal clock. We anchor everything to it." },
  { k: "02", t: "Get your dated 49 CFR calendar", d: "Every obligation — drug & alcohol, ELD, DQF, maintenance, the audit — in the exact order the regulation demands." },
  { k: "03", t: "Walk in audit-ready", d: "We surface your safety-audit window early and hand you the precise packet the auditor asks for." },
];

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-serif text-lg font-semibold tracking-tight">
          DOT&nbsp;Navigator<span style={{ color: "var(--color-red)" }}>.</span>
        </span>
        <Link href="/navigator" className="btn-ghost text-sm">
          Open the navigator →
        </Link>
      </header>

      <main>
        {/* hero */}
        <section aria-labelledby="hero" className="relative overflow-hidden border-b" style={{ borderColor: "var(--color-line)" }}>
          <div className="engrave pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="stamp">For first-year FMCSA carriers</span>
              <h1 id="hero" className="mt-6 font-serif font-semibold tracking-[-0.02em]" style={{ fontSize: "var(--text-hero)", lineHeight: 0.94 }}>
                You have
                <br />
                18&nbsp;months.
                <br />
                <span style={{ color: "var(--color-red)" }}>The clock started</span>
                <br />
                without you.
              </h1>
              <p className="mt-7 max-w-xl text-lg" style={{ color: "var(--color-ink-2)" }}>
                The day FMCSA issued your USDOT number, a federal countdown began — a mandatory safety audit within a
                year, dozens of 49 CFR obligations in a precise order, and <strong>authority revocation</strong> if you
                miss it. Most new owner-operators learn this from a PDF and a forum thread. Enter your number; we turn
                the whole regulation into a dated roadmap.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link href="/navigator" className="btn-primary">
                  Build my compliance roadmap →
                </Link>
                <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Free to view · no account · ~60s
                </span>
              </div>
            </div>
            <ComplianceSpine />
          </div>
        </section>

        {/* stats — a ledger strip */}
        <section aria-label="Why this matters" className="mx-auto max-w-6xl px-6 py-14">
          <dl className="grid gap-px overflow-hidden rounded-card border sm:grid-cols-3" style={{ borderColor: "var(--color-line-strong)", background: "var(--color-line-strong)" }}>
            {STATS.map((s) => (
              <div key={s.label} className="p-7" style={{ background: "var(--color-surface)" }}>
                <dt className="font-serif text-4xl font-semibold tracking-tight" style={{ color: "var(--color-red)" }}>
                  {s.n}
                </dt>
                <dd className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* how it works */}
        <section aria-labelledby="how" className="mx-auto max-w-6xl px-6 pb-16">
          <span className="eyebrow">How it works</span>
          <h2 id="how" className="mt-3 max-w-2xl font-serif font-semibold tracking-tight" style={{ fontSize: "var(--text-h2)", lineHeight: 1.04 }}>
            From a raw USDOT number to an audit-ready year
          </h2>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.k} className="card group p-7 transition" style={{ transitionTimingFunction: "var(--ease)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold" style={{ color: "var(--color-red)" }}>
                    {s.k}
                  </span>
                  <span className="h-px flex-1" style={{ background: "var(--color-line)" }} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* the wedge, stated plainly */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div
            className="relative overflow-hidden rounded-card border p-9 sm:p-12"
            style={{ background: "var(--color-ink)", borderColor: "var(--color-ink)" }}
          >
            <span className="eyebrow" style={{ color: "var(--color-brass)" }}>
              Why this exists
            </span>
            <p className="mt-4 max-w-3xl font-serif text-2xl leading-snug sm:text-3xl" style={{ color: "var(--color-paper)" }}>
              Document tools assume you already understand compliance. Managed-services firms charge for a department
              you can&apos;t afford. <span style={{ color: "var(--color-brass)" }}>Nobody sequences the first 18 months</span>{" "}
              for an owner-operator who just got their number. That gap is the whole point of this.
            </p>
            <Link href="/navigator" className="btn-primary mt-8">
              Start free →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: "var(--color-line)" }}>
        <div className="mx-auto max-w-6xl px-6 py-9 text-sm" style={{ color: "var(--color-muted)" }}>
          <p className="max-w-3xl">
            Decision-support, not legal advice. Windows reflect the common federal new-entrant minimums (49 CFR Parts
            382, 385, 387, 390, 391, 395, 396); state and edge-case requirements vary — verify against FMCSA.
          </p>
          <p className="mt-2">Preview build — billing is off. A product of The Native Factory.</p>
        </div>
      </footer>
    </div>
  );
}
