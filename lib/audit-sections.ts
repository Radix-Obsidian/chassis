// The audit-packet record checklist — what an FMCSA new-entrant safety audit asks for, organized by
// regulation. Shared by the teaser (AuditPacketPreview) and the paid FullPacket so they never drift.
export interface AuditSection {
  title: string;
  cfr: string;
  items: string[];
}

export const AUDIT_SECTIONS: AuditSection[] = [
  {
    title: "Driver qualification files",
    cfr: "49 CFR 391.51",
    items: [
      "Application for employment",
      "Motor vehicle record (MVR)",
      "Road test / CDL equivalency",
      "Current medical certificate",
      "Annual review of driving record",
    ],
  },
  {
    title: "Hours-of-service & ELD records",
    cfr: "49 CFR 395",
    items: ["6 months of HOS / ELD records", "ELD registration & malfunction log", "Supporting documents (BOLs, receipts)"],
  },
  {
    title: "Drug & alcohol program proof",
    cfr: "49 CFR 382",
    items: ["Consortium/C-TPA enrollment letter", "Pre-employment test results", "Random testing pool & rates", "Clearinghouse queries on file"],
  },
  {
    title: "Vehicle maintenance & inspection",
    cfr: "49 CFR 396",
    items: ["Maintenance file per vehicle", "Driver vehicle inspection reports (DVIR)", "Annual periodic inspection report"],
  },
  {
    title: "Registration & insurance",
    cfr: "49 CFR 387 / 390",
    items: ["Active insurance filings (BMC-91/91X)", "MCS-150 current within 24 months", "USDOT/operating authority record"],
  },
];
