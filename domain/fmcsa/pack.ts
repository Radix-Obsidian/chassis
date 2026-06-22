import type { DomainPack, WorkItem, ArtifactMeta } from "../contract";
import { fmcsaBrand } from "./brand";
import { generateCalendar, type CarrierProfile, type Milestone } from "../../lib/calendar-engine";
import { listDocuments } from "../../lib/documents";
import { bucketFor } from "../../lib/reminders";

// domains/fmcsa — the reference DomainPack. It assembles the existing CFR rules engine
// (calendar-engine), the document registry (documents), the reminder cadence (reminders), and the brand
// into the chassis contract. A new SKU mirrors this file: implement DomainPack over its own rules/docs,
// then point domain/index.ts + domain/brand.ts at it.
export const fmcsaPack: DomainPack = {
  key: "fmcsa",
  brand: fmcsaBrand,

  profileFields: [
    { key: "authorityDate", label: "Date operating authority was granted", required: true, kind: "date" },
    { key: "carrierType", label: "Operation type", required: true, kind: "enum", options: ["interstate", "intrastate"] },
    { key: "dotNumber", label: "USDOT number", required: false, kind: "string" },
  ],

  reminders: { thresholds: ["T-30", "T-7", "T-1", "overdue"], bucketFor },

  generateWorkItems(profile, anchorDateISO): WorkItem[] {
    const cp: CarrierProfile = {
      carrierType: (profile.carrierType as CarrierProfile["carrierType"]) ?? "interstate",
      dotNumber: profile.dotNumber as string | undefined,
      state: profile.state as string | undefined,
    };
    const milestones: Milestone[] = generateCalendar(cp, new Date(anchorDateISO));
    return milestones.map<WorkItem>((m) => ({
      key: m.key,
      title: m.title,
      dueDate: m.dueDate,
      cite: m.cfrCite,
      category: m.category,
      gating: m.isGating,
    }));
  },

  listArtifacts(): ArtifactMeta[] {
    return listDocuments().map((d) => ({ type: d.type, title: d.title, purpose: d.purpose, cite: d.cfrCite }));
  },
};
