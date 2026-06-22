// domain/pack.test.ts — the chassis contract guardrail. Proves the active DomainPack satisfies the
// contract the spine depends on. A new SKU's pack must pass this same suite. $0, pure.
import test from "node:test";
import assert from "node:assert/strict";
import { activeDomain } from "./index.ts";
import type { DomainPack } from "./contract.ts";

test("the active domain pack satisfies the DomainPack contract", () => {
  const pack: DomainPack = activeDomain; // compile-time conformance
  assert.ok(pack.key, "pack must have a key");
  assert.ok(pack.brand?.name, "pack must carry a brand name");
  assert.ok(pack.brand.products.unlock.name && pack.brand.products.subscription.name);
  assert.ok(pack.profileFields.length >= 1, "pack must declare profile fields");
  assert.ok(pack.reminders.thresholds.length >= 1);
});

test("reminder cadence buckets days-until into the SKU's thresholds", () => {
  assert.equal(activeDomain.reminders.bucketFor(-1), "overdue");
  assert.equal(activeDomain.reminders.bucketFor(1), "T-1");
  assert.equal(activeDomain.reminders.bucketFor(7), "T-7");
  assert.equal(activeDomain.reminders.bucketFor(30), "T-30");
  assert.equal(activeDomain.reminders.bucketFor(1000), null);
});

test("generateWorkItems produces dated work items from an account profile", () => {
  const items = activeDomain.generateWorkItems(
    { carrierType: "interstate", dotNumber: "3456789" },
    "2025-09-01",
  );
  assert.ok(items.length > 0, "expected at least one work item");
  for (const i of items.slice(0, 3)) {
    assert.ok(i.key && i.title, "work item needs key + title");
    assert.match(i.dueDate, /^\d{4}-\d{2}-\d{2}$/, "dueDate must be ISO YYYY-MM-DD");
  }
});

test("listArtifacts returns the SKU's preparable artifacts", () => {
  const arts = activeDomain.listArtifacts();
  assert.ok(arts.length >= 1);
  assert.ok(arts.every((a) => a.type && a.title), "every artifact needs a type + title");
});
