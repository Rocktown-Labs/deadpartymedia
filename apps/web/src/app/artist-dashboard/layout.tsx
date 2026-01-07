"use client"

import { useCurrentUser } from "@/lib/api/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ArtistDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: user, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "artist")) {
      router.push("/sign-in")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7CFC00] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "artist") {
    return null
  }

  return <>{children}</>
}

