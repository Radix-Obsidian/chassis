// email.ts — the Brevo transactional-email send boundary. Uses Brevo's REST API over the built-in fetch
// (Node 20+), so there's no email SDK dependency at all — the unit tests stay dependency-free and the
// bundle stays light. Verified shape: POST https://api.brevo.com/v3/smtp/email, header `api-key`, body
// { sender, to, subject, htmlContent, textContent }, success 201 with { messageId }.
//
// Guarded by design: with no BREVO_API_KEY (preview / local) sending is a logged no-op instead of a
// crash — the closed loop degrades to "we'd have emailed you" rather than taking the app down.

import type { OutboundEmail } from "./email-templates";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export function emailEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.BREVO_API_KEY;
}

export interface SendResult {
  sent: boolean;
  id?: string;
  skipped?: boolean;
}

// Sender from EMAIL_FROM ("Name <email>" or a bare address), else BREVO_SENDER_* fallbacks.
function parseSender(env: NodeJS.ProcessEnv): { name: string; email: string } {
  const defaultName = env.BREVO_SENDER_NAME || "DOT Navigator";
  const from = env.EMAIL_FROM?.trim();
  if (from) {
    const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1] || defaultName, email: m[2].trim() };
    if (from.includes("@")) return { name: defaultName, email: from };
  }
  return { name: defaultName, email: env.BREVO_SENDER_EMAIL || "no-reply@dot-navigator.app" };
}

export async function sendEmail(
  email: OutboundEmail,
  env: NodeJS.ProcessEnv = process.env
): Promise<SendResult> {
  if (!emailEnabled(env)) {
    console.warn(`[email] BREVO_API_KEY not set — skipping send to ${email.to} ("${email.subject}")`);
    return { sent: false, skipped: true };
  }
  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: parseSender(env),
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json().catch(() => ({}))) as { messageId?: string | number };
  return { sent: true, id: data?.messageId != null ? String(data.messageId) : undefined };
}
