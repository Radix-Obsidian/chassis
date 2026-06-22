"use client";

import { useState } from "react";

// Starts the subscription checkout (14-day trial). Auth is handled server-side; this just hands off to
// Stripe's hosted page for the signed-in carrier.
export function UpgradeButton({ label, className }: { label?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
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
      <button onClick={start} disabled={loading} className={className || "btn-primary"} aria-busy={loading}>
        {loading ? "Opening secure checkout…" : label || "Start my free trial"}
      </button>
      {error && (
        <p className="mt-2 text-sm" role="alert" style={{ color: "var(--color-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
