// send-test-email.ts — proves the real Brevo send path end-to-end. Run with the key loaded from the
// gitignored env file (the secret never appears on the command line):
//   node --env-file=.env.local --import tsx scripts/send-test-email.ts you@example.com
//
// It sends an actual magic-link-style email through lib/email.ts (the same code the app uses). Exit 0 =
// sent, 2 = skipped (no BREVO_API_KEY), 1 = error (e.g. unverified sender — which is a useful signal).

import { sendEmail } from "../lib/email";
import { magicLinkEmail } from "../lib/email-templates";

async function main() {
  const to = process.argv[2] || process.env.TEST_EMAIL_TO || "";
  if (!to) {
    console.error("usage: node --env-file=.env.local --import tsx scripts/send-test-email.ts <recipient>");
    process.exit(1);
  }
  const msg = magicLinkEmail(to, "https://dot-navigator.example/api/auth/verify?token=TEST_ONLY");
  console.log(`sending test "${msg.subject}" → ${to} …`);
  const res = await sendEmail(msg);
  console.log("result:", JSON.stringify(res));
  if (res.skipped) process.exit(2);
  if (!res.sent) process.exit(1);
  console.log("✓ Brevo accepted the message — check the inbox.");
}

main().catch((err) => {
  console.error("✗ send failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
