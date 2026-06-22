import Link from "next/link";

// Shown when the packet page is reached without a valid entitlement (cold link, or a payment we
// couldn't verify yet). It never reveals the paid packet; it routes the carrier to unlock it properly.
export function LockedPacket({ reason }: { reason: "locked" | "unverified" }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <span className="eyebrow">Full audit-ready packet</span>
      <h1 className="mt-3 font-serif text-3xl">
        {reason === "unverified" ? "We couldn't verify that purchase yet" : "This unlocks after checkout"}
      </h1>
      <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
        {reason === "unverified"
          ? "If you just paid, it may still be processing — refresh in a moment. If this keeps happening, the link may have expired; reach out and we'll make it right."
          : "Build your roadmap in the navigator, then choose “Unlock the full packet.” You'll come straight back here with everything audit-ready and printable."}
      </p>
      <div className="mt-6">
        <Link href="/navigator" className="btn-primary">
          Go to the navigator →
        </Link>
      </div>
    </div>
  );
}
