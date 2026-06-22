import { UpgradeButton } from "./UpgradeButton";
import { SUBSCRIPTION_PRICE_LABEL, SUBSCRIPTION_TRIAL_DAYS } from "@/lib/pricing";

const INCLUDED = [
  "Pre-filled MCS-150 — your USDOT identification report, ready to review and file",
  "Driver Qualification File checklist — every 391.51 item, per driver",
  "DVIR daily inspection log — the 396.11 record auditors check",
  "Safety-audit binder index — your make-or-break audit, organized for you",
  "Proactive email reminders — T-30, T-7, T-1, and overdue, so nothing slips",
  "Always current — we keep it in sync with your tracked roadmap",
];

// The done-for-you paywall. Free tier = tracking; this gates the labor (documents + reminders). Honest
// value stack + a real risk-reversal (full-access trial, cancel anytime). No dark patterns.
export function Paywall({ heading }: { heading?: string }) {
  return (
    <section aria-labelledby="paywall-h" className="mx-auto max-w-xl">
      <p className="eyebrow" style={{ color: "var(--color-accent)" }}>
        Done-for-you
      </p>
      <h1 id="paywall-h" className="mt-2 font-serif font-semibold" style={{ fontSize: "var(--text-h2)" }}>
        {heading || "Let us do the compliance paperwork"}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        Tracking your roadmap is free. The co-pilot prepares the actual documents and keeps you ahead of
        every deadline — the part that used to eat your weekends.
      </p>

      <div className="card mt-6 p-6">
        <ul className="space-y-3">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-3 text-sm">
              <span aria-hidden="true" style={{ color: "var(--color-good)" }}>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--color-line)" }}>
          <p className="font-serif text-2xl font-semibold">
            {SUBSCRIPTION_PRICE_LABEL}
            <span className="text-base font-normal" style={{ color: "var(--color-muted)" }}>
              {" "}
              / month
            </span>
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
            {SUBSCRIPTION_TRIAL_DAYS}-day free trial — full access, cancel anytime before it converts and pay
            nothing.
          </p>
          <div className="mt-4">
            <UpgradeButton label={`Start my ${SUBSCRIPTION_TRIAL_DAYS}-day free trial`} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
        Decision-support, not legal advice. We prepare, track, and remind — FMCSA requires your own
        signature to file, so the final submission is always yours.
      </p>
    </section>
  );
}
