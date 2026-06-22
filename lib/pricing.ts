// pricing.ts — single source of truth for prices, shared by server (charge amount) and client (display).
// Env knobs are NEXT_PUBLIC_ so both sides agree.
//
// Two models coexist in the code: the legacy anonymous one-time packet unlock (UNLOCK_*), and the primary
// account-based recurring subscription (SUBSCRIPTION_*) that gates the done-for-you co-pilot.

// --- Legacy one-time unlock (anonymous audit packet) ---
export const UNLOCK_PRICE_USD = Math.max(1, Math.round(Number(process.env.NEXT_PUBLIC_UNLOCK_PRICE_USD) || 49));
export const UNLOCK_PRICE_CENTS = UNLOCK_PRICE_USD * 100;
export const UNLOCK_PRICE_LABEL = `$${UNLOCK_PRICE_USD}`;

// --- Subscription (the co-pilot: prepared documents + proactive reminders) ---
export const SUBSCRIPTION_PRICE_USD = Math.max(1, Number(process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_USD) || 49.99);
export const SUBSCRIPTION_PRICE_CENTS = Math.round(SUBSCRIPTION_PRICE_USD * 100);
export const SUBSCRIPTION_PRICE_LABEL = `$${SUBSCRIPTION_PRICE_USD.toFixed(2)}`;
export const SUBSCRIPTION_TRIAL_DAYS = Math.max(0, Math.round(Number(process.env.SUBSCRIPTION_TRIAL_DAYS) || 14));
