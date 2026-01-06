import type React from "react"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import MobileBottomNav from "@/components/mobile-bottom-nav"

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="pb-16 lg:pb-0">{children}</div>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
