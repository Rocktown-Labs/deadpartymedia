import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  const userRole = isSuperAdmin ? "super_admin" : "writer";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#111111] border-r border-gray-800 min-h-screen p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-[#7CFC00]">Admin</h1>
            <p className="text-sm text-gray-400 mt-1">
              Role: {userRole === "super_admin" ? "Super Admin" : "Writer"}
            </p>
          </div>

          <nav className="space-y-2">
            <Link
              href="/admin"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/posts"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Posts
            </Link>
            <Link
              href="/admin/events"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/admin/artists"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Artists
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Users
              </Link>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
