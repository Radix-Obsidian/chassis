// /dashboard/documents — the "we did the prep" index. Lists every document we prepare for the carrier,
// each pre-filled from their saved profile. Auth + a roadmap required.

import { redirect } from "next/navigation";
import Link from "next/link";
import { currentCarrier } from "@/lib/session";
import { generateDocument, listDocuments, type DocumentCarrier } from "@/lib/documents";
import { isEntitled } from "@/lib/subscription";
import { Paywall } from "@/components/Paywall";
import type { CarrierType } from "@/lib/calendar-engine";

export const dynamic = "force-dynamic";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-lg font-semibold">
          DOT Navigator<span style={{ color: "var(--color-accent)" }}>.</span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium hover:underline">
          ← Roadmap
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-2">{children}</main>
    </div>
  );
}

export default async function Documents() {
  const carrier = await currentCarrier();
  if (!carrier) redirect("/signin");
  if (!carrier.authorityDate) redirect("/dashboard");

  if (!isEntitled(carrier)) {
    return (
      <PageShell>
        <Paywall />
      </PageShell>
    );
  }

  const profile: DocumentCarrier = {
    legalName: carrier.legalName ?? undefined,
    dotNumber: carrier.dotNumber ?? undefined,
    carrierType: (carrier.carrierType as CarrierType) ?? "interstate",
    authorityDate: carrier.authorityDate.toISOString().slice(0, 10),
  };

  const docs = listDocuments().map((meta) => ({ meta, doc: generateDocument(meta.type, profile) }));

  return (
    <PageShell>
      <p className="eyebrow">Prepared for you</p>
      <h1 className="mt-2 font-serif font-semibold" style={{ fontSize: "var(--text-h2)" }}>
        Your compliance paperwork
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        We assemble the actual forms — correctly identified, CFR-cited, and pre-filled with what we know
        about your operation. You review, complete the blanks, and sign.
      </p>

      <div className="mt-8 space-y-4">
        {docs.map(({ meta, doc }) => (
          <Link
            key={meta.type}
            href={`/dashboard/documents/${meta.type}`}
            className="card flex items-start justify-between gap-4 p-5 transition hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="cfr">{meta.cfrCite}</p>
              <h2 className="mt-1 font-semibold leading-snug">{meta.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
                {meta.purpose}
              </p>
            </div>
            <span
              className="shrink-0 whitespace-nowrap text-xs font-medium"
              style={{ color: "var(--color-good)" }}
            >
              {doc.prefilledCount} pre-filled →
            </span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
