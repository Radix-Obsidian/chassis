// /dashboard/documents/[type] — a single prepared, printable document. Auth + a roadmap required.

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentCarrier } from "@/lib/session";
import { generateDocument, DOCUMENT_REGISTRY, type DocumentCarrier, type DocumentType } from "@/lib/documents";
import { isEntitled } from "@/lib/subscription";
import { DocumentView } from "@/components/DocumentView";
import { PrintButton } from "@/components/PrintButton";
import type { CarrierType } from "@/lib/calendar-engine";

export const dynamic = "force-dynamic";

const VALID = new Set<string>(DOCUMENT_REGISTRY.map((d) => d.type));

export default async function DocumentPage({ params }: { params: { type: string } }) {
  if (!VALID.has(params.type)) notFound();

  const carrier = await currentCarrier();
  if (!carrier) redirect("/signin");
  if (!carrier.authorityDate) redirect("/dashboard");
  if (!isEntitled(carrier)) redirect("/dashboard/documents"); // paywall lives there

  const profile: DocumentCarrier = {
    legalName: carrier.legalName ?? undefined,
    dotNumber: carrier.dotNumber ?? undefined,
    carrierType: (carrier.carrierType as CarrierType) ?? "interstate",
    authorityDate: carrier.authorityDate.toISOString().slice(0, 10),
  };
  const doc = generateDocument(params.type as DocumentType, profile);

  return (
    <div>
      <header className="no-print mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/dashboard/documents" className="text-sm font-medium hover:underline">
          ← All documents
        </Link>
        <PrintButton />
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        <DocumentView doc={doc} />
      </main>
    </div>
  );
}
