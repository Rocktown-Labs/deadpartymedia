import type React from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { getCart } from "@/lib/fourthwall";
import { getCartId } from "./cart/actions";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.deadpartymedia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
  description:
    "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.",

  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Dead Party Media",
    title: "Dead Party Media - Your #1 Outlet for Arkansas Music & Events",
    description:
      "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Dead Party Media Logo",
      },
    ],
  },
  title: {
    default: "Dead Party Media - Your #1 Outlet for Arkansas Music & Events",
    template: "%s | Dead Party Media",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dead Party Media - Your #1 Outlet for Arkansas Music & Events",
    description:
      "Your #1 digital outlet for Arkansas music and live events. We cover artists across all genres, host events, and deliver exclusive content and interviews.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cartId = await getCartId();
  const cart = getCart(cartId, "USD");

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <CartProvider cartPromise={cart}>
            <Navbar />
            <div className="pb-16 lg:pb-0">{children}</div>
            <div className="pb-16 lg:pb-0">
              <Footer />
            </div>
            <MobileBottomNav />
          </CartProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
