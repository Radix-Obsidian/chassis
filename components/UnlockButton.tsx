"use client";

import { useState } from "react";
import { UNLOCK_PRICE_LABEL } from "@/lib/pricing";
import type { CarrierType } from "@/lib/calendar-engine";

// Starts the one-time checkout: posts the carrier's calendar inputs to /api/checkout and hands off to
// Stripe's hosted page. The inputs ride along so the paid packet is reproducible with no account/DB.
export function UnlockButton({
  inputs,
  className,
}: {
  inputs: { carrierType: CarrierType; authorityDate: string; dotNumber?: string };
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function unlock() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout is unavailable right now.");
      window.location.href = data.url as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={unlock} disabled={loading} className={className || "btn-primary"} aria-busy={loading}>
        {loading ? "Opening secure checkout…" : `Unlock the full packet — ${UNLOCK_PRICE_LABEL} one-time`}
      </button>
      {error && (
        <p className="mt-2 text-sm" role="alert" style={{ color: "var(--color-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
