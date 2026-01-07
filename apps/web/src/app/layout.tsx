import type React from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-context";
import { getCart } from "@/lib/fourthwall";
import { getCartId } from "./cart/actions";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import MobileBottomNav from "@/components/mobile-bottom-nav";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.deadpartymedia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/dead-party-logo.png`;

export const metadata: Metadata = {
  title: {
    default: "Dead Party Media - Arkansas Music",
    template: "%s | Dead Party Media",
  },
  description: "Your #1 outlet for Arkansas music",
  generator: "v0.app",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Dead Party Media",
    title: "Dead Party Media - Arkansas Music",
    description: "Your #1 outlet for Arkansas music",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Dead Party Media Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dead Party Media - Arkansas Music",
    description: "Your #1 outlet for Arkansas music",
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
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
            <Footer />
            <MobileBottomNav />
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
