import type React from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import AdminMobileNav from "@/components/admin/admin-mobile-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <AdminSidebar />
      <main className="lg:ml-64 transition-all duration-300">
        <div className="p-8 pt-20 lg:pt-8 pb-16 lg:pb-8">{children}</div>
      </main>
      <AdminMobileNav />
    </div>
  )
}
