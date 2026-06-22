// The conversion hook: the new-entrant safety-audit countdown. Turns urgent (red) inside 30 days.
export function CountdownBanner({
  daysUntil,
  dueDate,
  onPrep,
}: {
  daysUntil: number;
  dueDate: string;
  onPrep: () => void;
}) {
  const urgent = daysUntil <= 30;
  const past = daysUntil < 0;
  return (
    <section
      className="card overflow-hidden"
      style={{ borderColor: urgent ? "var(--color-accent)" : "var(--color-line)" }}
      aria-labelledby="audit-countdown"
    >
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-4">
          <div
            className="font-serif tabular-nums leading-none"
            style={{ fontSize: "3.25rem", color: urgent ? "var(--color-accent)" : "var(--color-ink)" }}
          >
            {past ? "—" : daysUntil}
          </div>
          <div>
            <h2 id="audit-countdown" className="text-sm font-semibold uppercase tracking-wide">
              {past ? "Audit window has opened" : "Days to your safety-audit window"}
            </h2>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              FMCSA audits new entrants within 12 months · target {dueDate} · <span className="cfr">49 CFR 385</span>
            </p>
          </div>
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={onPrep}>
          Build my audit packet →
        </button>
      </div>
      {urgent && (
        <p className="px-6 pb-4 text-sm font-medium" style={{ color: "var(--color-accent)" }}>
          A failed new-entrant safety audit can revoke your operating authority. Have every record audit-ready now.
        </p>
      )}
    </section>
  );
}
