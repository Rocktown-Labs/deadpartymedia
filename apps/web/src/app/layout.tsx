import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { CartProvider } from "@/components/cart/cart-context"
import { getCart } from "@/lib/fourthwall"
import { getCartId } from "./cart/actions"
import Providers from "@/components/providers"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Dead Party Media - Arkansas Music",
  description: "Your #1 outlet for Arkansas music",
    generator: 'v0.app'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cartId = await getCartId()
  const cart = getCart(cartId, "USD")

  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          <CartProvider cartPromise={cart}>{children}</CartProvider>
        </Providers>
      </body>
    </html>
  )
}
