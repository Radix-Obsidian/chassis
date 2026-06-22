// session.ts — read the current carrier from the request cookie inside Server Components and Route
// Handlers. Thin wrapper over auth.getCarrierFromSession so pages don't touch cookie plumbing directly.

import { cookies } from "next/headers";
import { SESSION_COOKIE, getCarrierFromSession } from "./auth";

export async function currentCarrier() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return getCarrierFromSession(token);
}
