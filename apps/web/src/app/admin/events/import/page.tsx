import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { createEventImportArtistStubAction } from "./actions";
import EventFlyerImportClient from "./event-flyer-import-client";

export default async function EventFlyerImportPage() {
  if (!(await canCreate())) {
    redirect("/admin/events");
  }

  return <EventFlyerImportClient onCreateArtistStub={createEventImportArtistStubAction} />;
}
