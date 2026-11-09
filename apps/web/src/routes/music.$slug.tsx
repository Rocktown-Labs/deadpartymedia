import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/music/$slug")({
  component: () => {
    const { slug } = Route.useParams();
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white pt-24 px-6">
        <div className="container mx-auto">
          <p className="text-zinc-400">Release: {slug}</p>
        </div>
      </main>
    );
  },
  head: ({ params }) => ({ meta: [{ title: params.slug + " | Dead Party Media" }] }),
});
