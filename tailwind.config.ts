import type { Config } from "tailwindcss";

// Tokens live in CSS custom properties (app/globals.css); Tailwind maps to them so utilities and
// raw CSS stay in sync. Palette: regulatory ink + a safety-red accent + amber warning — deliberate,
// not a default gray-on-white template.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        surface: "var(--color-surface)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        warn: "var(--color-warn)",
        good: "var(--color-good)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
    },
  },
  plugins: [],
};

export default config;
