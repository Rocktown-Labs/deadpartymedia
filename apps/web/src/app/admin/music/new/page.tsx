import { redirect } from "next/navigation";
import { canCreate } from "@/lib/auth/access";
import { MusicReleaseForm } from "@/components/admin/music-release-form";
import { createMusicRelease } from "../actions";
import type { Route } from "next";

export default async function NewMusicReleasePage() {
  if (!(await canCreate())) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Release</h1>
      <MusicReleaseForm onSubmit={createMusicRelease} cancelHref={"/admin/music" as Route} />
    </div>
  );
}
