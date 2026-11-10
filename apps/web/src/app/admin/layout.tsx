import { useRouteContext } from "@tanstack/react-router";
import { AdminShell } from "./admin-shell";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = useRouteContext({ from: "__root__" });
  const isSuperAdmin = session?.roles.includes("super_admin") ?? false;
  return (
    <AdminShell isSuperAdmin={isSuperAdmin} userRole={isSuperAdmin ? "super_admin" : "writer"}>
      {children}
    </AdminShell>
  );
}
