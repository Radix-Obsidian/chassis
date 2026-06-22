import type { Brand } from "../contract";

// The FMCSA reference SKU's brand. This is the single source of identity the spine reads (via
// domain/brand.ts). Point domain/brand.ts at a different pack's brand and every email + checkout
// re-skins with zero spine edits. Values here are exactly what DOT Navigator shipped.
export const fmcsaBrand: Brand = {
  name: "DOT Navigator",
  colors: { ink: "#1c1917", accent: "#b91c1c", muted: "#78716c" },
  emailDisclaimer:
    "Decision-support for FMCSA new-entrant compliance — not legal advice. You're receiving this because you started a compliance roadmap at DOT Navigator.",
  products: {
    unlock: {
      name: "DOT Navigator — full audit-ready packet",
      description:
        "Your personalized 18-month FMCSA new-entrant compliance packet, audit-ready and exportable.",
    },
    subscription: {
      name: "DOT Navigator — compliance co-pilot",
      description:
        "Prepared documents (MCS-150, DQF, DVIR, audit binder) + proactive deadline reminders, kept current for your carrier.",
    },
  },
};
