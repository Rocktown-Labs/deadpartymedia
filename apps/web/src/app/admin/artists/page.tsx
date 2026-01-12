import { redirect } from "next/navigation";
import { checkRole } from "@/lib/auth/roles";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { deleteArtist, inviteArtistToClaim } from "./actions";

export default async function ArtistsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");

  if (!isSuperAdmin && !isWriter) {
    redirect("/");
  }

  const allArtists = await db
    .select()
    .from(artists)
    .orderBy(desc(artists.createdAt));

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">Artists</h1>
        <Link href="/admin/artists/new">
          <Button>Create New Artist</Button>
        </Link>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0A0A0A] border-b border-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Genre
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Claimed
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {allArtists.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                  No artists found
                </td>
              </tr>
            ) : (
              allArtists.map((artist) => (
                <tr key={artist.id} className="hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/artists/${artist.id}`}
                      className="font-bold hover:text-[#7CFC00] transition-colors"
                    >
                      {artist.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {artist.genre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {artist.location}
                  </td>
                  <td className="px-6 py-4">
                    {artist.claimed ? (
                      <span className="text-green-400 font-bold">✓ Claimed</span>
                    ) : (
                      <span className="text-gray-500">Not claimed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {artist.email || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/artists/${artist.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {!artist.claimed && artist.email && (
                        <form
                          action={inviteArtistToClaim.bind(
                            null,
                            artist.id,
                            artist.email!
                          )}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Resend Invite
                          </Button>
                        </form>
                      )}
                      {isSuperAdmin && (
                        <DeleteConfirm
                          onConfirm={async () => {
                            await deleteArtist(artist.id);
                          }}
                          title="Delete Artist"
                          description={`Are you sure you want to delete "${artist.name}"? This action cannot be undone.`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
