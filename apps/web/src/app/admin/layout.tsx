import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import { AdminShell } from "./admin-shell";

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
    <AdminShell isSuperAdmin={isSuperAdmin} userRole={userRole}>
      {children}
    </AdminShell>
  );
}
