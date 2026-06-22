// /dashboard — the closed-loop home. Server-rendered from PERSISTED state (the difference from the free,
// in-memory /navigator). Reads the session cookie → loads the carrier + their remembered milestone
// state → computes the view + the single next action. No session → /signin. No authority date yet →
// onboarding.

import { redirect } from "next/navigation";
import Link from "next/link";
import { currentCarrier } from "@/lib/session";
import { getMilestoneStates } from "@/lib/carrier-store";
import { buildDashboardView, type StoredCarrierProfile } from "@/lib/carrier-view";
import { isEntitled, subscriptionLabel } from "@/lib/subscription";
import { SUBSCRIPTION_TRIAL_DAYS } from "@/lib/pricing";
import { UpgradeButton } from "@/components/UpgradeButton";
import { ManageBillingButton } from "@/components/ManageBillingButton";
import type { CarrierType } from "@/lib/calendar-engine";
import { Onboarding } from "./Onboarding";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const carrier = await currentCarrier();
  if (!carrier) redirect("/signin");

  const header = (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="font-serif text-lg font-semibold">
        DOT Navigator<span style={{ color: "var(--color-accent)" }}>.</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm sm:inline" style={{ color: "var(--color-muted)" }}>
          {carrier.email}
        </span>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="text-sm font-medium hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );

  if (!carrier.authorityDate) {
    return (
      <div>
        {header}
        <main className="mx-auto max-w-xl px-6 pb-24 pt-6">
          <Onboarding
            initial={{
              carrierType: (carrier.carrierType as CarrierType) ?? "interstate",
              dotNumber: carrier.dotNumber ?? "",
              legalName: carrier.legalName ?? "",
            }}
          />
        </main>
      </div>
    );
  }

  const profile: StoredCarrierProfile = {
    carrierType: (carrier.carrierType as CarrierType) ?? "interstate",
    authorityDate: carrier.authorityDate.toISOString().slice(0, 10),
    dotNumber: carrier.dotNumber ?? undefined,
  };
  const states = await getMilestoneStates(carrier.id);
  const view = buildDashboardView(profile, states);
  const entitled = isEntitled(carrier);

  const billingStrip = (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        {subscriptionLabel(carrier)}
      </p>
      {entitled ? (
        <ManageBillingButton className="btn-ghost text-sm" />
      ) : (
        <UpgradeButton
          className="btn-primary text-sm"
          label={`Unlock done-for-you — ${SUBSCRIPTION_TRIAL_DAYS}-day free trial`}
        />
      )}
    </div>
  );

  return (
    <div>
      {header}
      <main className="mx-auto max-w-5xl space-y-4 px-6 pb-24 pt-2">
        {billingStrip}
        <DashboardClient
          view={view}
          profile={{ ...profile, legalName: carrier.legalName ?? "" }}
        />
      </main>
    </div>
  );
}
