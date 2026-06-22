// reminder-scheduler.ts — the in-process scheduler that closes the loop. Instead of a separate cron
// service, the running web server itself fires the reminder sweep: once shortly after boot, then on a
// fixed interval. sweepReminders is idempotent (it claims each (carrier, milestone, stage) slot via a
// unique key before sending), so re-running it never double-sends — which is what makes a plain interval
// safe here. Set REMINDERS_DISABLED=true to turn it off without a redeploy.

import { sweepReminders } from "./reminder-runner";

const FIRST_RUN_DELAY_MS = 30_000; // let the DB and app settle after a cold boot
const INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6h; idempotency makes the exact cadence non-critical

let started = false;

export function startReminderScheduler(env: NodeJS.ProcessEnv = process.env): void {
  if (started) return; // guard: register() can fire more than once across a process
  started = true;

  if (env.REMINDERS_DISABLED === "true") {
    console.log("[reminder-scheduler] disabled via REMINDERS_DISABLED");
    return;
  }

  const origin = env.APP_ORIGIN || "http://localhost:3000";

  const run = async () => {
    try {
      const summary = await sweepReminders(origin);
      console.log("[reminder-scheduler] sweep:", JSON.stringify(summary));
    } catch (err) {
      console.error("[reminder-scheduler] sweep failed:", err);
    }
  };

  setTimeout(run, FIRST_RUN_DELAY_MS);
  const timer = setInterval(run, INTERVAL_MS);
  // Don't let the interval alone keep the process alive; the HTTP server owns the lifecycle.
  if (typeof timer.unref === "function") timer.unref();
  console.log("[reminder-scheduler] started: first sweep in 30s, then every 6h");
}
