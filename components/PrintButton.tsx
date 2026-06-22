"use client";

// Tiny client island so the (server-rendered, entitlement-verified) packet can offer Save-as-PDF.
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      Print / Save as PDF
    </button>
  );
}
