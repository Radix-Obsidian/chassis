import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "New Entrant DOT Navigator — your 18-month FMCSA compliance roadmap",
  description:
    "Enter your USDOT number and the date your authority was granted. Get a personalized, dated 18-month FMCSA compliance calendar — every 49 CFR obligation in order, with your new-entrant safety audit front and center.",
};

export const viewport: Viewport = {
  themeColor: "#b91c1c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
