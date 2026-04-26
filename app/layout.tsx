import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OCHE — Free Darts Scorer & Scorekeeper",
    template: "%s — OCHE",
  },
  description:
    "The darts scoring app that handles everything — bust detection, X01 from 301 to 1001, " +
    "checkout hints, live averages, tournaments and friend challenges. No password, any device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;800;900&family=JetBrains+Mono:wght@300;400;500;700&family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-cream antialiased">{children}</body>
    </html>
  );
}
