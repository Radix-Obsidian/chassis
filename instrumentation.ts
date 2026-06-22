// instrumentation.ts — Next.js startup hook. Runs once when the server process boots. We use it to start
// the in-process reminder scheduler, so the closed loop self-closes (reminders fire on a schedule) without
// a separate cron service. Guarded to the Node.js server runtime only — never the edge runtime or build.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderScheduler } = await import("./lib/reminder-scheduler");
    startReminderScheduler();
  }
}
