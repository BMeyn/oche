import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OCHE — Free Darts Scorer & Scorekeeper",
  description:
    "The darts scoring app that handles everything — bust detection, X01 from 301 to 1001, " +
    "checkout hints, live averages, tournaments and friend challenges. No password, any device.",
  keywords: [
    "darts scorer", "darts scorekeeper", "X01 darts", "darts calculator",
    "501 darts", "darts checkout", "darts app", "online darts score", "darts tracker",
  ],
  openGraph: {
    title: "OCHE — Three darts. Zero math.",
    description:
      "Bust detection, checkout hints, tournaments, friend challenges. Free darts scoring for your next match.",
    url: "https://oche.cloud",
    siteName: "OCHE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OCHE — Free Darts Scorer",
    description: "Three darts. Zero math. Bust detection, checkout hints, tournaments and friend challenges.",
  },
  alternates: { canonical: "https://oche.cloud" },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "OCHE",
  applicationCategory: "SportsApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Free darts scorer with bust detection, checkout hints, X01 from 301 to 1001, " +
    "tournaments, friend challenges and live match statistics.",
  url: "https://oche.cloud",
  featureList: [
    "X01 scoring (301, 501, 701, 1001)",
    "High-Low game mode",
    "Double-out, Master-out, Double-in rules",
    "Checkout hint suggestions up to 170",
    "Live 3-dart averages",
    "Single-elimination tournament brackets",
    "Round-robin leagues",
    "Friend challenges and leaderboard",
    "Full match history and statistics",
  ],
};

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/lobby");
  const { error } = await searchParams;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage error={error} />
    </>
  );
}
