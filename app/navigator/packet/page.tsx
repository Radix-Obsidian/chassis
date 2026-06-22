import { redirect } from "next/navigation";
import { verifyEntitlement, mintEntitlement } from "@/lib/entitlement";
import { getStripe, paidClaimsFromSession } from "@/lib/stripe";
import { FullPacket } from "@/components/FullPacket";
import { LockedPacket } from "@/components/LockedPacket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The paid packet, gated SERVER-SIDE:
//  1. ?token=...   → verify the HMAC (server secret); valid → render the full packet. Bookmarkable.
//  2. ?session_id= → just back from Stripe; verify payment server-side, mint a token, redirect to (1).
//  3. otherwise    → the locked pitch (never reveals the paid packet).
export default async function PacketPage({
  searchParams,
}: {
  searchParams: { token?: string; session_id?: string };
}) {
  const secret = process.env.ENTITLEMENT_SIGNING_SECRET || "";

  // 1. bookmarkable, verified token
  if (searchParams.token && secret) {
    const claims = verifyEntitlement(searchParams.token, secret);
    if (claims) return <FullPacket claims={claims} />;
  }

  // 2. fresh from Stripe — verify payment, then redirect to the clean token URL.
  //    (mint inside try; redirect() OUTSIDE try, or its control-flow signal would be swallowed.)
  let freshToken: string | null = null;
  if (searchParams.session_id && secret) {
    try {
      const stripe = await getStripe();
      const paid = await paidClaimsFromSession(stripe, searchParams.session_id);
      if (paid) freshToken = mintEntitlement(paid, secret);
    } catch {
      /* fall through to locked */
    }
  }
  if (freshToken) redirect(`/navigator/packet?token=${encodeURIComponent(freshToken)}`);

  // 3. not unlocked
  return <LockedPacket reason={searchParams.session_id ? "unverified" : "locked"} />;
}
