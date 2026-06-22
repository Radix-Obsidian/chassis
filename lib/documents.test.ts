import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOCUMENT_REGISTRY,
  listDocuments,
  generateDocument,
  type DocumentCarrier,
} from "./documents";

const FULL: DocumentCarrier = {
  legalName: "Rivera Hauling LLC",
  dotNumber: "3456789",
  carrierType: "interstate",
  authorityDate: "2025-06-01",
};
const SPARSE: DocumentCarrier = { carrierType: "intrastate", authorityDate: "2025-06-01" };

test("registry exposes the four document types with required meta", () => {
  const types = DOCUMENT_REGISTRY.map((d) => d.type).sort();
  assert.deepEqual(types, ["audit-binder", "dqf", "dvir", "mcs150"]);
  for (const d of DOCUMENT_REGISTRY) {
    assert.ok(d.title.length > 0);
    assert.ok(d.purpose.length > 0);
    assert.match(d.cfrCite, /CFR/);
  }
  assert.deepEqual(listDocuments(), DOCUMENT_REGISTRY);
});

test("generateDocument throws on an unknown type", () => {
  // @ts-expect-error — testing the runtime guard
  assert.throws(() => generateDocument("nope", FULL), /unknown document type/);
});

test("MCS-150 pre-fills known identity fields and flags the rest blank", () => {
  const doc = generateDocument("mcs150", FULL);
  const idFields = doc.sections[0].fields;
  const usdot = idFields.find((f) => f.label === "USDOT number");
  assert.equal(usdot?.status, "prefilled");
  assert.equal(usdot?.value, "3456789");
  const op = idFields.find((f) => f.label === "Operation classification");
  assert.equal(op?.value, "Interstate");
  const addr = idFields.find((f) => f.label.includes("business address"));
  assert.equal(addr?.status, "blank");
  assert.ok(addr?.hint && addr.hint.length > 0, "blank fields carry a hint");
});

test("MCS-150 with a sparse profile leaves name/USDOT blank but still fills operation type", () => {
  const doc = generateDocument("mcs150", SPARSE);
  const idFields = doc.sections[0].fields;
  assert.equal(idFields.find((f) => f.label === "Legal business name")?.status, "blank");
  assert.equal(idFields.find((f) => f.label === "USDOT number")?.status, "blank");
  assert.equal(idFields.find((f) => f.label === "Operation classification")?.value, "Intrastate");
});

test("prefilledCount and blankCount equal the actual field tallies", () => {
  const doc = generateDocument("mcs150", FULL);
  let pre = 0;
  let bl = 0;
  for (const s of doc.sections) for (const f of s.fields) (f.status === "prefilled" ? pre++ : bl++);
  assert.equal(doc.prefilledCount, pre);
  assert.equal(doc.blankCount, bl);
  assert.ok(pre >= 3, "FULL profile should pre-fill at least name+USDOT+operation");
});

test("audit binder pre-fills identity and references the prepared documents", () => {
  const doc = generateDocument("audit-binder", FULL);
  assert.equal(doc.supportsMilestoneKey, "safety-audit-window");
  const all = doc.sections.flatMap((s) => s.fields);
  assert.ok(all.some((f) => f.value === "3456789"), "USDOT pre-filled");
  const refs = JSON.stringify(doc.sections).toLowerCase();
  assert.ok(refs.includes("dqf"), "binder cross-references the DQF");
  assert.ok(refs.includes("dvir"), "binder cross-references the DVIR");
});

test("DQF and DVIR are CFR-cited checklists (template docs, mostly blank)", () => {
  const dqf = generateDocument("dqf", FULL);
  assert.ok(dqf.blankCount > 0);
  assert.ok(JSON.stringify(dqf.sections).includes("391."));
  const dvir = generateDocument("dvir", FULL);
  assert.ok(dvir.sections.flatMap((s) => s.fields).some((f) => f.label.includes("signature")));
});
