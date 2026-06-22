"use client";

import { useState } from "react";

// Opens the Stripe Customer Portal for the signed-in carrier (update card, view invoices, cancel).
export function ManageBillingButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={open} disabled={loading} className={className || "btn-ghost"} aria-busy={loading}>
      {loading ? "Opening…" : "Manage billing"}
    </button>
  );
}
