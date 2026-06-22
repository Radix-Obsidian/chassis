// Circular compliance indicator — share of non-gating milestones completed. Pure CSS/SVG, no chart lib.
export function ComplianceScore({ score }: { score: number }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const tone = score >= 80 ? "var(--color-good)" : score >= 40 ? "var(--color-warn)" : "var(--color-accent)";
  return (
    <div className="flex items-center gap-4">
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Compliance ${score} percent`}>
        <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x="66" y="62" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--color-ink)">
          {score}%
        </text>
        <text x="66" y="84" textAnchor="middle" fontSize="11" fill="var(--color-muted)">
          on track
        </text>
      </svg>
      <div>
        <p className="text-sm font-semibold">Compliance health</p>
        <p className="max-w-[14rem] text-sm" style={{ color: "var(--color-muted)" }}>
          Routine obligations completed. Gating items (audit, registrations) are tracked separately — they are
          pass/fail.
        </p>
      </div>
    </div>
  );
}
