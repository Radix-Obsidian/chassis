// The audit-packet teaser shown inline on the dashboard. It previews the STRUCTURE of the packet; the
// full, dated, exportable packet is the paid one-time unlock (UnlockButton → Stripe → /navigator/packet).
import { AUDIT_SECTIONS } from "@/lib/audit-sections";
import { UnlockButton } from "@/components/UnlockButton";
import { UNLOCK_PRICE_LABEL } from "@/lib/pricing";
import type { CarrierType } from "@/lib/calendar-engine";

export function AuditPacketPreview({
  onClose,
  inputs,
}: {
  onClose: () => void;
  inputs: { carrierType: CarrierType; authorityDate: string; dotNumber?: string };
}) {
  return (
    <section className="card p-6" aria-labelledby="audit-packet">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge" style={{ color: "var(--color-accent)", borderColor: "var(--color-accent)" }}>
            Sample
          </span>
          <h2 id="audit-packet" className="mt-2 font-serif text-2xl">
            Your new-entrant safety-audit packet
          </h2>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--color-muted)" }}>
            Exactly what the auditor will ask for, organized by regulation, with where to find each record. This is
            the structure — unlock the full version to get it <em>dated to your authority</em> and ready to print.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border px-3 py-1 text-sm"
          style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {AUDIT_SECTIONS.map((s) => (
          <div key={s.title} className="rounded-lg border p-4" style={{ borderColor: "var(--color-line)" }}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{s.title}</h3>
              <span className="cfr">{s.cfr}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {s.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} aria-hidden="true" />
                  <span style={{ color: "var(--color-muted)" }}>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border p-5" style={{ borderColor: "var(--color-line-strong)", background: "var(--color-paper-2)" }}>
        <h3 className="font-serif text-lg">Unlock your full, audit-ready packet</h3>
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
          <li>✓ Every record above, organized exactly the way the auditor asks for it</li>
          <li>✓ Dated to <em>your</em> authority date — you know what's due and when</li>
          <li>✓ The make-or-break safety-audit window, flagged with prep steps</li>
          <li>✓ Print it or save a clean PDF to hand to your auditor</li>
        </ul>
        <p className="mt-3 text-sm" style={{ color: "var(--color-ink)" }}>
          <strong>30-day money-back guarantee.</strong> If it doesn't make your audit prep easier, email us for a full
          refund — and keep the packet.
        </p>
        <div className="mt-4">
          <UnlockButton inputs={inputs} />
        </div>
        <p className="mt-2 cfr">
          One-time {UNLOCK_PRICE_LABEL} · secure checkout by Stripe · no account needed
        </p>
      </div>
    </section>
  );
}
