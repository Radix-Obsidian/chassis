// documents.ts — the "does the work" half. Pure (no DB), so it tests freely and renders deterministically
// from the carrier's stored profile. Open-loop tools point you at FMCSA.gov and wish you luck; this
// assembles the actual paperwork — correctly identified, CFR-cited, and pre-filled with what we already
// know about you — so the carrier reviews and signs instead of authoring from a blank page.
//
// Honest scope: we pre-fill what we hold (legal name, USDOT, operation type, authority date) and clearly
// flag the rest as fields the carrier supplies. That's still doing the work: the right form, the right
// fields, the right citation — not a link dump.

import type { CarrierType } from "./calendar-engine";

export type DocumentType = "mcs150" | "dqf" | "dvir" | "audit-binder";

export interface DocumentCarrier {
  legalName?: string;
  dotNumber?: string;
  carrierType: CarrierType;
  authorityDate: string; // ISO YYYY-MM-DD
}

export type DocFieldStatus = "prefilled" | "blank";

export interface DocField {
  label: string;
  value?: string; // present when prefilled
  hint?: string; // guidance when blank
  status: DocFieldStatus;
}

export interface DocSection {
  heading: string;
  note?: string;
  fields: DocField[];
}

export interface DocumentMeta {
  type: DocumentType;
  title: string;
  purpose: string;
  cfrCite: string;
  supportsMilestoneKey?: string;
}

export interface GeneratedDocument extends DocumentMeta {
  sections: DocSection[];
  prefilledCount: number;
  blankCount: number;
}

export const DOCUMENT_REGISTRY: DocumentMeta[] = [
  {
    type: "mcs150",
    title: "MCS-150 — Motor Carrier Identification Report",
    purpose:
      "Your USDOT registration of record. New entrants file it to register and must keep it current (biennial update). FMCSA pulls it at the safety audit.",
    cfrCite: "49 CFR 390.19 / 390.201",
    supportsMilestoneKey: "insurance-filings",
  },
  {
    type: "dqf",
    title: "Driver Qualification File (DQF) — per driver",
    purpose:
      "The file you must keep for every driver. Missing DQF items are one of the most common safety-audit failures. This is the complete checklist with citations.",
    cfrCite: "49 CFR 391.51",
    supportsMilestoneKey: "dqf",
  },
  {
    type: "dvir",
    title: "Driver Vehicle Inspection Report (DVIR) — daily log",
    purpose:
      "The daily inspection record drivers must complete. Keep these on file; the auditor checks that the system exists and is used.",
    cfrCite: "49 CFR 396.11 / 396.13",
    supportsMilestoneKey: "maintenance-records",
  },
  {
    type: "audit-binder",
    title: "New Entrant Safety Audit — binder index",
    purpose:
      "The make-or-break milestone. This is the organized index of every record category the auditor reviews, with your identity pre-filled and cross-references to the documents above.",
    cfrCite: "49 CFR 385 Subpart D",
    supportsMilestoneKey: "safety-audit-window",
  },
];

const OPERATION_LABEL: Record<CarrierType, string> = {
  interstate: "Interstate",
  intrastate: "Intrastate",
};

function prefilled(label: string, value: string | undefined, hint: string): DocField {
  return value
    ? { label, value, status: "prefilled" }
    : { label, hint, status: "blank" };
}
const blank = (label: string, hint: string): DocField => ({ label, hint, status: "blank" });

function mcs150Sections(c: DocumentCarrier): DocSection[] {
  return [
    {
      heading: "Carrier identity",
      fields: [
        prefilled("Legal business name", c.legalName, "Your registered legal entity name"),
        prefilled("USDOT number", c.dotNumber, "Your assigned USDOT number"),
        {
          label: "Operation classification",
          value: OPERATION_LABEL[c.carrierType],
          status: "prefilled",
        },
        blank("Doing-business-as (DBA) name", "If you operate under a trade name"),
        blank("Principal business address", "Physical street address (no PO box)"),
        blank("Mailing address", "If different from the principal address"),
        blank("EIN or SSN", "Your federal tax ID"),
        blank("Company official + title", "The person certifying this report"),
        blank("Phone / email", "Primary contact for FMCSA"),
      ],
    },
    {
      heading: "Operation & fleet",
      note: "FMCSA uses these counts to size your safety oversight — keep them accurate.",
      fields: [
        blank("Number of power units", "Trucks/tractors you operate"),
        blank("Number of drivers", "Including yourself if you drive"),
        blank("Estimated annual mileage", "Total fleet miles, most recent year"),
        blank("Cargo classifications", "Check all you haul (general freight, etc.)"),
        blank("Hazmat?", "Yes/No — and classes if yes"),
      ],
    },
  ];
}

function dqfSections(): DocSection[] {
  return [
    {
      heading: "Driver",
      fields: [
        blank("Driver full name", "One DQF per driver"),
        blank("Date of hire", ""),
        blank("CDL number + state", "If a CDL is required for the vehicle class"),
      ],
    },
    {
      heading: "Required records (check as completed)",
      note: "Every item below is required by 49 CFR 391.51 — a gap here is an audit finding.",
      fields: [
        blank("Employment application", "391.21 — full 3-year history"),
        blank("Inquiry to previous employers", "391.23 — safety performance history"),
        blank("Motor Vehicle Record (MVR) — initial", "391.23 — at hire"),
        blank("Annual MVR + review of driving record", "391.25 — every 12 months"),
        blank("Road test certificate or CDL equivalency", "391.31 / 391.33"),
        blank("Medical examiner's certificate", "391.43 — current, from the national registry"),
        blank("Clearinghouse pre-employment full query", "382.701 — before first dispatch"),
      ],
    },
  ];
}

function dvirSections(): DocSection[] {
  return [
    {
      heading: "Daily inspection log",
      note: "Reproduce one row per vehicle per day. Defects affecting safety must be repaired before the vehicle is operated.",
      fields: [
        blank("Date", ""),
        blank("Vehicle / unit number", ""),
        blank("Odometer reading", ""),
        blank("Defects found? (Y/N)", "List any defect or deficiency"),
        blank("Description of defects", "Brakes, lights, tires, coupling, etc."),
        blank("Driver signature", "Certifies the report"),
        blank("Repairs made / not needed", "Mechanic certification of correction"),
        blank("Following driver review signature", "When defects were noted"),
      ],
    },
  ];
}

function auditBinderSections(c: DocumentCarrier): DocSection[] {
  return [
    {
      heading: "Carrier under audit",
      fields: [
        prefilled("Legal business name", c.legalName, "Your registered legal entity name"),
        prefilled("USDOT number", c.dotNumber, "Your assigned USDOT number"),
        { label: "Operation classification", value: OPERATION_LABEL[c.carrierType], status: "prefilled" },
        { label: "Authority granted", value: c.authorityDate, status: "prefilled" },
      ],
    },
    {
      heading: "Record categories the auditor reviews",
      note: "Assemble each tab. The first three map to the documents this tool prepares for you.",
      fields: [
        blank("General — MCS-150 current, insurance (BMC-91), BOC-3", "Tab 1 — see your MCS-150 sheet"),
        blank("Driver qualification files", "Tab 2 — one DQF per driver (see DQF checklist)"),
        blank("Vehicle maintenance + DVIRs + annual inspection", "Tab 3 — see your DVIR log"),
        blank("Drug & alcohol program", "Consortium agreement, Clearinghouse registration, test results"),
        blank("Hours-of-Service / ELD records", "Supporting documents for the audit period"),
        blank("Accident register", "390.15 — even if empty, present it"),
      ],
    },
  ];
}

function buildSections(type: DocumentType, c: DocumentCarrier): DocSection[] {
  switch (type) {
    case "mcs150":
      return mcs150Sections(c);
    case "dqf":
      return dqfSections();
    case "dvir":
      return dvirSections();
    case "audit-binder":
      return auditBinderSections(c);
  }
}

export function listDocuments(): DocumentMeta[] {
  return DOCUMENT_REGISTRY;
}

export function generateDocument(type: DocumentType, carrier: DocumentCarrier): GeneratedDocument {
  const meta = DOCUMENT_REGISTRY.find((d) => d.type === type);
  if (!meta) throw new Error(`unknown document type: ${type}`);
  const sections = buildSections(type, carrier);
  let prefilledCount = 0;
  let blankCount = 0;
  for (const s of sections)
    for (const f of s.fields) (f.status === "prefilled" ? prefilledCount++ : blankCount++);
  return { ...meta, sections, prefilledCount, blankCount };
}
