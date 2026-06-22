// Signature hero motif: the 18-month new-entrant timeline as a vertical "compliance spine" — stamped
// milestone nodes, a red AUDIT gate near month 11, a permanent-authority cap at 18. Illustrative (not the
// live engine); it's the brand's memorable visual — a regulatory timeline you can feel the clock on.
const NODES = [
  { when: "Day 1", label: "Authority granted", tone: "start" },
  { when: "Week 1", label: "Insurance + process agent", tone: "normal" },
  { when: "Month 1", label: "Drug & alcohol consortium", tone: "normal" },
  { when: "Month 6", label: "Records · ELD · maintenance", tone: "normal" },
  { when: "Month 11", label: "New-entrant SAFETY AUDIT", tone: "gate" },
  { when: "Month 18", label: "Permanent authority", tone: "end" },
] as const;

export function ComplianceSpine() {
  return (
    <figure
      className="card relative w-full overflow-hidden p-7"
      aria-label="Illustrative 18-month FMCSA new-entrant compliance timeline"
      style={{ background: "var(--color-surface)" }}
    >
      <figcaption className="mb-6 flex items-center justify-between">
        <span className="eyebrow">18-month roadmap</span>
        <span className="cfr">49 CFR · sequenced</span>
      </figcaption>

      <ol className="relative ml-1 space-y-5">
        {/* the spine */}
        <span
          className="absolute left-[7px] top-1 bottom-1 w-0.5"
          style={{ background: "linear-gradient(var(--color-line-strong), var(--color-line))" }}
          aria-hidden="true"
        />
        {NODES.map((n) => {
          const gate = n.tone === "gate";
          const end = n.tone === "end";
          const dot =
            gate ? "var(--color-red)" : end ? "var(--color-good)" : n.tone === "start" ? "var(--color-ink)" : "var(--color-line-strong)";
          return (
            <li key={n.label} className="relative flex items-start gap-4 pl-7">
              <span
                className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2"
                style={{
                  borderColor: dot,
                  background: gate || end || n.tone === "start" ? dot : "var(--color-surface)",
                  boxShadow: gate ? "0 0 0 5px var(--color-red-soft)" : "none",
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <span className="cfr block" style={{ color: "var(--color-muted)" }}>
                  {n.when}
                </span>
                {gate ? (
                  <span className="stamp mt-1">⚠ {n.label}</span>
                ) : (
                  <span
                    className="text-[0.95rem] font-medium leading-tight"
                    style={{ color: end ? "var(--color-good)" : "var(--color-ink)" }}
                  >
                    {n.label}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 border-t pt-4 text-sm" style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}>
        Your real calendar is generated from <em>your</em> authority date — every obligation dated to the day.
      </p>
    </figure>
  );
}
