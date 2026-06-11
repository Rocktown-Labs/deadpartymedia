import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import { createArtistProfileStub } from "@/app/admin/users/actions";
import EventFlyerImportClient from "./event-flyer-import-client";

export default async function EventFlyerImportPage() {
  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    redirect("/admin/events");
  }

  return <EventFlyerImportClient onCreateArtistStub={createArtistProfileStub} />;
}
