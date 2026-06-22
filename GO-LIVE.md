# GO-LIVE — provision, then the deliberate founder-only flip to real charges

The closed-loop co-pilot has two layers to bring up: **(A) infrastructure** so it runs at all (database,
email, scheduler), and **(B) the irreversible charge flip**. Nothing here runs autonomously. The flip
mirrors the factory's publish+charge gate (D5): the machine builds and proves everything in TEST mode;
*you* decide to take real money. Until you complete the flip, the SKU **physically refuses** to charge a
live card (`assertChargesAllowed` in `lib/stripe.ts`).

## Where it stands now (TEST)
- Free tier (anonymous `/navigator` calendar) works with **no keys at all**.
- The closed-loop co-pilot (accounts, tracking dashboard, prepared documents, reminders) is built and
  unit-tested (59/59); the SKU passes the factory `closed-loop-check`.
- Subscription checkout is `mode: subscription`, **$49.99/mo with a 14-day free trial**, gated to the
  done-for-you (documents + reminders). With `sk_test_` keys a TEST subscription runs end-to-end.
- `LIVE_CHARGES_ENABLED` is unset → a live key would be refused.

## A. Provision the infrastructure (do this first — needed even in TEST)
1. **Postgres** — Railway → add a Postgres plugin → copy its connection string into `DATABASE_URL`.
   Then create the tables: `npm run db:migrate` (or `npm run db:push` for the first stand-up).
2. **Brevo** (magic-link sign-in + reminder emails) — create a v3 API key (Settings → SMTP & API → API
   Keys) → set `BREVO_API_KEY`. Set `EMAIL_FROM` to a **verified sender/domain** in Brevo before go-live.
   Without a key the app degrades to a logged no-op (sign-in links won't arrive), so set it before inviting users.
3. **Reminder cron** — set `CRON_SECRET` (`openssl rand -hex 24`). Add a Railway scheduled job (daily) that
   does `curl -X POST https://<domain>/api/cron/reminders -H "Authorization: Bearer $CRON_SECRET"`.
   With no `CRON_SECRET` the endpoint rejects every call (fail-closed).
4. **App origin** — set `APP_ORIGIN=https://<your-domain>` so magic-link + reminder URLs are absolute.

## B. Prerequisites before you flip to live charges (your domain, not the machine's)
1. A real legal entity and a Stripe account activated for live payments.
2. **Stripe Tax** configured (sales tax/VAT becomes your liability the moment you charge).
3. Public **refund/dispute policy** + Terms + Privacy, and a real inbox. The trial is the risk-reversal —
   honor cancellations cleanly via the Customer Portal.
4. Create a **live recurring Price** in Stripe ($49.99/mo) and set `STRIPE_SUBSCRIPTION_PRICE_ID` to it
   (preferred over the inline price), or confirm `NEXT_PUBLIC_SUBSCRIPTION_PRICE_USD`.
5. Enable the **Stripe Customer Portal** (live mode) so `/api/billing/portal` works.

## C. The flip (in Railway env, never in git)
1. Create a **restricted** live key (Checkout + Billing Portal + read scopes) where possible.
2. Set in the Railway service env:
   - `STRIPE_SECRET_KEY=<restricted live key>`
   - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_SUBSCRIPTION_PRICE_ID=<live recurring price id>`
   - `STRIPE_WEBHOOK_SECRET=<whsec_ from the LIVE endpoint>` (add the endpoint below first)
3. In Stripe (live mode) add a webhook → `https://<domain>/api/webhooks/stripe` with events:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted` → copy its `whsec_` into the env above.
4. **`LIVE_CHARGES_ENABLED=true`** ← this is THE flip. The SKU refuses a live key without it.
5. Redeploy. Subscribe yourself with a real card, confirm the dashboard unlocks the documents + a reminder
   fires, then cancel/refund in Stripe to confirm the full loop before announcing.

## Deploy via Railway CLI (the fast path — TEST mode)
Run from `~/dot-navigator` (CLI already logged in). Secrets live in Railway, never in git.
```bash
railway init                                  # create the project
railway add -d postgres                       # provision Postgres
railway up                                    # build + deploy the app service from this dir
railway domain                                # get a public URL  →  use it as APP_ORIGIN below

# set env on the app service (DATABASE_URL is a Railway reference; keep the single quotes):
railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
railway variables --set-from-stdin BREVO_API_KEY        # paste the xkeysib- key, then Ctrl-D
railway variables --set 'EMAIL_FROM=DOT Navigator <hello@itsvoco.com>'
railway variables --set-from-stdin STRIPE_SECRET_KEY    # sk_test_...
railway variables --set-from-stdin STRIPE_PUBLISHABLE_KEY
railway variables --set-from-stdin ENTITLEMENT_SIGNING_SECRET   # rotate: openssl rand -hex 32
railway variables --set 'NEXT_PUBLIC_SUBSCRIPTION_PRICE_USD=49.99'
railway variables --set 'SUBSCRIPTION_TRIAL_DAYS=14'
railway variables --set-from-stdin CRON_SECRET          # openssl rand -hex 24
railway variables --set 'APP_ORIGIN=https://<your-railway-domain>'

railway run npm run db:migrate                # create tables in the cloud DB (migrate deploy)
```
Then in the Railway dashboard add a **daily Cron** that runs:
`curl -X POST "$APP_ORIGIN/api/cron/reminders" -H "Authorization: Bearer $CRON_SECRET"`.
Verify a real send first: `node --env-file=.env.local --import tsx scripts/send-test-email.ts <inbox>`.

## If this SKU is ever published via the factory control plane
That path has a **second** founder gate: `deploy-guard.sh publish` still requires the factory's
`PUBLISH_APPROVAL_TOKEN` + a matching runtime `APPROVAL`. The SKU's `LIVE_CHARGES_ENABLED` is the SKU-edge
gate; D5 is the factory-edge gate. Both are founder-only, by design.

## Legacy one-time unlock
The anonymous one-time audit-packet unlock (`/api/checkout` + `/navigator/packet`) still exists and is
still TEST-gated by the same `assertChargesAllowed`. The primary model is now the subscription; retire the
one-time path when you're confident, or keep it as a no-account quick buy.

## Before scaling (hardening)
- **Rate-limit** the auth + checkout + cron endpoints (edge/middleware) — they hit Stripe/DB/Brevo per call.
- **Secrets**: rotate any secret that ever touched a non-prod environment before going live.
- **npm audit** flags Next.js advisories that need a Next 15/16 major upgrade — a separate, deliberate pass.

## Kill-switch
Unset `LIVE_CHARGES_ENABLED` (or revert to `sk_test_` keys) and redeploy → new charges stop immediately.
Existing subscriptions continue in Stripe until you cancel them there; entitlement follows Stripe status.
