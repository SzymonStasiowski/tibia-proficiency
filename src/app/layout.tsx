import type { Metadata } from "next";
import { Geist, Geist_Mono, Jersey_25 } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import StructuredData from "@/components/StructuredData";
import Footer from "@/components/Footer";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppToaster } from '@/components/ui/sonner-toaster'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jersey25 = Jersey_25({
  variable: "--font-jersey",
  subsets: ["latin"],
  weight: "400", // Jersey 25 is a single weight font
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "TibiaVote - Community Weapon Proficiency Builder & Voting Platform",
  description: "Build and vote for the best weapon proficiency combinations in Tibia. Community-driven weapon builds, perk rankings, and statistical analysis for all Tibia weapons. Find the most popular weapon setups voted by the community.",
  keywords: ['Tibia', 'weapon proficiency', 'weapon builds', 'perk combinations', 'MMORPG', 'community voting', 'weapon stats', 'Tibia weapons', 'game builds', 'RPG builds', 'TibiaVote'],
  authors: [{ name: 'TibiaVote Community' }],
  creator: 'TibiaVote',
  publisher: 'TibiaVote',
  robots: 'index, follow',
  openGraph: {
    title: 'TibiaVote - Community Weapon Proficiency Builder',
    description: 'Build and vote for the best weapon proficiency combinations in Tibia. Community-driven weapon builds and perk rankings.',
    url: 'https://tibiavote.com',
    siteName: 'TibiaVote',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TibiaVote - Community Weapon Proficiency Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TibiaVote - Community Weapon Proficiency Builder',
    description: 'Build and vote for the best weapon proficiency combinations in Tibia.',
    creator: '@tibiavote',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://tibiavote.com',
  },
  category: 'Gaming',
  applicationName: 'TibiaVote',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body
        className={`${jersey25.variable} ${geistSans.variable} ${geistMono.variable} ${jersey25.className} antialiased min-h-screen flex flex-col`}
      >
        <QueryProvider>
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </QueryProvider>
        <AppToaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
