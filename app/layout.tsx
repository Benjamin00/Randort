import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans, Audiowide } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500"],
});

const audiowide = Audiowide({
  subsets: ["latin"],
  variable: "--font-audiowide",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Randоrt",
  description: "Roll for a random place near you.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Randоrt",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#EDEAE5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${audiowide.variable}`}>
      <body>{children}</body>
    </html>
  );
}
