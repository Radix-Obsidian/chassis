"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CarrierType } from "@/lib/calendar-engine";

export function Onboarding({
  initial,
}: {
  initial: { carrierType: CarrierType; dotNumber: string; legalName: string };
}) {
  const router = useRouter();
  const [legalName, setLegalName] = useState(initial.legalName);
  const [dotNumber, setDotNumber] = useState(initial.dotNumber);
  const [authorityDate, setAuthorityDate] = useState("");
  const [carrierType, setCarrierType] = useState<CarrierType>(initial.carrierType);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!authorityDate || Number.isNaN(Date.parse(authorityDate + "T00:00:00Z"))) {
      setError("Enter the date your FMCSA authority was granted.");
      return;
    }
    setError("");
    setSaving(true);
    const res = await fetch("/api/carrier", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName, dotNumber, authorityDate, carrierType }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <section aria-labelledby="onb-h">
      <p className="eyebrow">One-time setup</p>
      <h1 id="onb-h" className="mt-2 font-serif font-semibold" style={{ fontSize: "var(--text-h2)" }}>
        Anchor your roadmap
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        We anchor your entire 18-month compliance calendar to the date FMCSA granted your authority.
        Set it once — we&apos;ll track every deadline from here.
      </p>

      <form onSubmit={save} className="card mt-6 space-y-5 p-6">
        <div>
          <label htmlFor="legal" className="mb-1.5 block text-sm font-medium">
            Legal business name <span style={{ color: "var(--color-muted)" }}>(optional)</span>
          </label>
          <input id="legal" className="field" placeholder="e.g. Rivera Hauling LLC" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>

        <div>
          <label htmlFor="dot" className="mb-1.5 block text-sm font-medium">
            USDOT number <span style={{ color: "var(--color-muted)" }}>(optional)</span>
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
                type="button"
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

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Build my tracked roadmap →"}
        </button>
      </form>
    </section>
  );
}
