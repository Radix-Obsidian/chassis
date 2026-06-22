// email-templates.ts — outbound email bodies. Pure string builders (no deps), so they're trivially
// testable and carry the brand voice into the inbox. Inline styles only (email clients strip <style>).

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

import { brand } from "../domain/brand";

// Identity comes from the active domain pack (domain/brand.ts) — swap the pack, re-skin every email.
const BRAND = brand.name;
const INK = brand.colors.ink;
const ACCENT = brand.colors.accent;
const MUTED = brand.colors.muted;

function shell(headline: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#faf8f5;font-family:ui-serif,Georgia,'Times New Roman',serif;color:${INK};">
  <div style="max-width:520px;margin:0 auto;padding:40px 28px;">
    <p style="font-weight:700;font-size:18px;letter-spacing:-0.01em;margin:0 0 24px;">${BRAND}<span style="color:${ACCENT};">.</span></p>
    <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;">${headline}</h1>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e7e2db;margin:32px 0 16px;" />
    <p style="font-size:12px;color:${MUTED};line-height:1.5;margin:0;">${brand.emailDisclaimer}</p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-family:ui-sans-serif,system-ui,sans-serif;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${label}</a>`;
}

export function magicLinkEmail(to: string, link: string): OutboundEmail {
  return {
    to,
    subject: `Your ${BRAND} sign-in link`,
    html: shell(
      "Sign in to your compliance roadmap",
      `<p style="font-size:15px;line-height:1.6;color:${INK};margin:0 0 24px;">Click below to open your saved roadmap. This link works once and expires in 15 minutes.</p>
       <p style="margin:0 0 24px;">${button(link, "Open my roadmap →")}</p>
       <p style="font-size:13px;color:${MUTED};line-height:1.6;margin:0;">If you didn't request this, you can safely ignore it — no one can access your roadmap without this link.</p>`
    ),
    text: `Sign in to your ${BRAND} compliance roadmap.\n\nOpen this link (works once, expires in 15 minutes):\n${link}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function reminderEmail(opts: {
  to: string;
  milestoneTitle: string;
  cfrCite: string;
  dueDate: string;
  daysUntil: number;
  dashboardUrl: string;
}): OutboundEmail {
  const { to, milestoneTitle, cfrCite, dueDate, daysUntil, dashboardUrl } = opts;
  const when =
    daysUntil < 0
      ? `was due ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} ago`
      : daysUntil === 0
        ? "is due today"
        : `is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
  return {
    to,
    subject: `${daysUntil < 0 ? "Overdue" : "Coming up"}: ${milestoneTitle}`,
    html: shell(
      `A compliance milestone ${when}`,
      `<p style="font-size:15px;line-height:1.6;margin:0 0 8px;"><strong>${milestoneTitle}</strong></p>
       <p style="font-size:13px;color:${MUTED};margin:0 0 24px;">${cfrCite} · due ${dueDate}</p>
       <p style="margin:0 0 24px;">${button(dashboardUrl, "Open my roadmap →")}</p>
       <p style="font-size:13px;color:${MUTED};line-height:1.6;margin:0;">We track this so you don't have to. Mark it done in your roadmap and we'll stop reminding you.</p>`
    ),
    text: `${milestoneTitle}\n${cfrCite} · due ${dueDate} (${when}).\n\nOpen your roadmap: ${dashboardUrl}`,
  };
}
