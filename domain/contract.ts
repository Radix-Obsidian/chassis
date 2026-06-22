// domain/contract.ts — the Chassis ↔ SKU contract. A DomainPack is everything a SKU supplies so the
// generic spine (auth, billing, email, scheduler, deploy gate) can OPERATE it. The pack in domains/fmcsa/
// is the reference implementation; a new SKU implements this same interface and drops it in.
//
// N=1 note (YAGNI): the rules/profile payloads are typed structurally, not generically. The account
// `profile` is an open record the pack interprets; when SKU #2 lands we promote it to a generic param.
// Until then a single concrete pack keeps the contract honest without speculative abstraction.

export interface BrandColors {
  ink: string;
  accent: string;
  muted: string;
}

// Everything that makes a SKU look/sound like itself. Swap this and every spine touchpoint (emails,
// checkout product copy) re-skins — without editing spine code.
export interface Brand {
  name: string;
  colors: BrandColors;
  emailDisclaimer: string; // footer compliance line (already includes the product name)
  products: {
    unlock: { name: string; description: string }; // one-time purchase
    subscription: { name: string; description: string }; // recurring co-pilot
  };
}

// A unit of work the SKU tracks for an account (FMCSA: a compliance milestone).
export interface WorkItem {
  key: string;
  title: string;
  dueDate: string; // ISO YYYY-MM-DD
  cite?: string; // regulatory/source citation
  category?: string;
  gating?: boolean; // failure risks the account's core outcome
}

// An artifact the SKU prepares for the account (FMCSA: MCS-150, DQF, DVIR, audit binder).
export interface ArtifactMeta {
  type: string;
  title: string;
  purpose: string;
  cite?: string;
}

// A field the SKU collects from the account to drive its rules engine.
export interface ProfileField {
  key: string;
  label: string;
  required: boolean;
  kind: "string" | "date" | "enum";
  options?: string[]; // for kind: "enum"
}

// Proactive reminder cadence (FMCSA: T-30 / T-7 / T-1 / overdue).
export interface ReminderCadence {
  thresholds: string[];
  bucketFor(daysUntil: number): string | null;
}

// The contract a SKU fulfills. The spine never imports a SKU's modules directly — it reads the active
// pack through domain/index.ts (and the active brand through domain/brand.ts).
export interface DomainPack {
  key: string; // e.g. "fmcsa"
  brand: Brand;
  profileFields: ProfileField[];
  reminders: ReminderCadence;
  // Rules engine: an account's profile + the anchor date → the work items it owns.
  generateWorkItems(profile: Record<string, unknown>, anchorDateISO: string): WorkItem[];
  // The artifacts this SKU can prepare for an account.
  listArtifacts(): ArtifactMeta[];
}
