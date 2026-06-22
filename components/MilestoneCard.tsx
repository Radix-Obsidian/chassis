import type { Milestone, MilestoneStatus } from "@/lib/calendar-engine";

const STATUS_STYLE: Record<MilestoneStatus, { label: string; color: string; dot: string }> = {
  done: { label: "Done", color: "var(--color-good)", dot: "var(--color-good)" },
  overdue: { label: "Overdue", color: "var(--color-accent)", dot: "var(--color-accent)" },
  "due-soon": { label: "Due soon", color: "var(--color-warn)", dot: "var(--color-warn)" },
  upcoming: { label: "Upcoming", color: "var(--color-muted)", dot: "var(--color-line)" },
};

export function MilestoneCard({
  milestone,
  status,
  daysUntil,
  onToggle,
}: {
  milestone: Milestone;
  status: MilestoneStatus;
  daysUntil: number;
  onToggle: () => void;
}) {
  const s = STATUS_STYLE[status];
  const done = status === "done";
  return (
    <article
      className="card flex gap-4 p-5 transition"
      style={{ borderColor: status === "overdue" ? "var(--color-accent)" : "var(--color-line)", opacity: done ? 0.7 : 1 }}
    >
      <button
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark "${milestone.title}" not done` : `Mark "${milestone.title}" done`}
        className="mt-0.5 h-6 w-6 shrink-0 rounded-md border-2 transition"
        style={{
          borderColor: done ? "var(--color-good)" : "var(--color-line)",
          background: done ? "var(--color-good)" : "transparent",
        }}
      >
        {done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {milestone.isGating && (
            <span className="badge" style={{ color: "var(--color-accent)", borderColor: "var(--color-accent)" }}>
              Gating
            </span>
          )}
          <span className="badge">{milestone.category}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: s.color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} aria-hidden="true" />
            {s.label}
            {!done && (status === "upcoming" || status === "due-soon") && ` · ${daysUntil}d`}
          </span>
        </div>
        <h3 className="mt-1.5 font-semibold leading-snug" style={{ textDecoration: done ? "line-through" : "none" }}>
          {milestone.title}
        </h3>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          {milestone.description}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <time className="text-sm font-medium tabular-nums">{milestone.dueDate}</time>
          <span className="cfr">{milestone.cfrCite}</span>
        </div>
      </div>
    </article>
  );
}
