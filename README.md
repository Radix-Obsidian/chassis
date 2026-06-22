# Chassis — the Native Factory's reusable SKU framework

The manufacturing-floor scaffold every SKU inherits. The factory ([apex-factory-core](https://github.com/Radix-Obsidian/apex-factory-core))
ideates, gates, builds, and ships products; **Chassis is the shared spine those products are built on**, so SKU #2
is a *domain-pack swap*, not a fork-and-rewrite. It's a closed-loop Next.js app extracted from the factory's first
shipped SKU ([DOT Navigator](https://github.com/Radix-Obsidian/dot-navigator)) — the reference domain pack still
lives here, in `domains/fmcsa`.

> Use this repo as a **template** (`gh repo create <org>/<sku> --template Radix-Obsidian/chassis`), then implement a
> `DomainPack` for your vertical.

## The split: spine vs. domain pack

```
chassis/
├── lib/                  # THE SPINE — generic, every SKU reuses it unchanged
│   ├── auth-tokens.ts    #   passwordless token crypto (HMAC, constant-time)
│   ├── auth.ts session.ts#   magic-link sign-in + sessions
│   ├── stripe.ts         #   checkout + the founder-gated live-charge guard (assertChargesAllowed)
│   ├── entitlement.ts    #   HMAC-signed proof-of-purchase (no-DB unlock)
│   ├── subscription.ts   #   Stripe-status → access tiers
│   ├── billing-store.ts  #   Stripe → account sync
│   ├── email.ts          #   Brevo REST (graceful no-op without a key)
│   ├── email-templates.ts#   email bodies — brand pulled from the active pack
│   ├── reminders.ts      #   pure "what's due now" planner + cadence buckets
│   ├── reminder-*.ts     #   in-process scheduler + DB sweep (idempotent)
│   ├── pricing.ts db.ts  #   price config + Prisma singleton
│   └── *.test.ts         #   59 spine unit tests
│
├── domain/               # THE SEAM — what makes a SKU itself
│   ├── contract.ts       #   the DomainPack interface (Brand, WorkItem, ArtifactMeta, ReminderCadence…)
│   ├── brand.ts          #   ACTIVE brand selector (spine reads identity from here)
│   ├── index.ts          #   ACTIVE pack selector (activeDomain)
│   ├── pack.test.ts      #   contract conformance suite (your pack must pass it)
│   └── fmcsa/            #   the REFERENCE domain pack (DOT Navigator)
│       ├── brand.ts      #     name, colors, email disclaimer, product copy
│       └── pack.ts       #     rules engine + artifact registry + cadence, assembled into a DomainPack
│
├── app/ components/      # UI — FMCSA reference today (see "What's deferred")
├── prisma/               # schema (auth/billing generic; FMCSA models = reference)
├── GO-LIVE.md            # the founder-only provision-then-charge runbook (template)
└── CLOSED-LOOP.md        # the D19 closed-loop manifest (reference: FMCSA)
```

## The contract — what a SKU supplies

A SKU implements one interface ([`domain/contract.ts`](domain/contract.ts)):

```ts
interface DomainPack {
  key: string;                 // "fmcsa"
  brand: Brand;                // name, colors, email disclaimer, checkout product copy
  profileFields: ProfileField[];        // what you collect from an account
  reminders: ReminderCadence;           // your proactive nudge thresholds
  generateWorkItems(profile, anchorDateISO): WorkItem[];   // your rules engine
  listArtifacts(): ArtifactMeta[];                          // what you prepare for the account
}
```

The spine never imports a SKU's modules directly — it reads `activeDomain` ([`domain/index.ts`](domain/index.ts))
and `brand` ([`domain/brand.ts`](domain/brand.ts)). Swap those two re-exports and every email + checkout re-skins
with zero spine edits. The reference implementation is [`domains/fmcsa/pack.ts`](domain/fmcsa/pack.ts) — copy it.

## Create a new SKU

```bash
gh repo create Radix-Obsidian/<sku> --private --template Radix-Obsidian/chassis
cd <sku> && npm install
# 1. add domain/<sku>/brand.ts + pack.ts implementing DomainPack
# 2. point domain/brand.ts + domain/index.ts at your pack
# 3. npm test   # the contract suite (domain/pack.test.ts) must pass
# 4. follow GO-LIVE.md to provision + (founder-gated) go live
```

## What's proven vs. deferred (honest, per the factory charter)

**Proven now** — the chassis builds and **63 tests pass** (59 spine + 4 contract). The FMCSA logic runs *through*
the `DomainPack` contract, and brand/copy are sourced from the active pack — i.e. DOT Navigator reconstituted on the
chassis, green. The founder-gated live-charge guard (`assertChargesAllowed`, D5 at the SKU edge) is intact.

**Deferred to SKU #2** (YAGNI from N=1, the factory's reuse discipline): genericizing the *UI* (`app/`, `components/`
are still FMCSA-shaped) and the *entity/schema* (`Carrier` + FMCSA columns → generic `Account` + `profile` JSON +
`WorkItem`/`Artifact`/`Event`). The contract + reference pack are exactly what a second domain needs; we abstract the
rest when a real second SKU pulls on it, not before.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Prisma/Postgres · Stripe · Brevo · Railway. Free tier
runs with no keys; billing needs Stripe TEST keys; reminders need `BREVO_API_KEY` + a cron (see GO-LIVE.md).
