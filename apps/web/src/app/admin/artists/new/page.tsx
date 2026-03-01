import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { ArtistForm } from "@/components/admin/artist-form";
import { createArtist } from "../actions";
import type { Route } from "next";

export default async function NewArtistPage() {
  if (!(await canCreate())) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Artist</h1>
      <ArtistForm onSubmit={createArtist} cancelHref={"/admin/artists" as Route} />
    </div>
  );
}
