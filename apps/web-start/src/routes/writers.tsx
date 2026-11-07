import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getAbsoluteUrl } from "../lib/seo";

/**
 * Ported verbatim (content + copy) from apps/web/src/app/writers/page.tsx —
 * a fully static page in the source.
 */
export const Route = createFileRoute("/writers")({
  component: WritersPage,
  head: () => ({
    links: [{ href: getAbsoluteUrl("/writers"), rel: "canonical" }],
    meta: [
      {
        content:
          "Meet the Dead Party Media writing team covering Arkansas country, EDM, hardcore, hip-hop, and local live music.",
        name: "description",
      },
      { title: "Writers | Dead Party Media" },
    ],
  }),
});

const writers = [
  {
    bio: "Hey, my name is J.L. Jones! I'm a musician, singer and songwriter from Central Arkansas. I love alternative music of all kinds but I'm especially excited about highlighting artists in the alternative Country and Folk genre!",
    cashTag: "$JLJones6",
    category: "Country",
    name: "J.L. Jones",
  },
  {
    bio: "Hey! My name is Gretchen and I am currently in college studying to become a Journalist with an online emphasis. I want to use my degree to uplift our local music scene and give an unbiased look into the EDM community in Arkansas! I'll be keeping you up-to-date with local shows and artists that you need to keep an eye out for! You can also catch me as rave ref at a rave near you!",
    cashTag: "$GretchenBullinger",
    category: "EDM",
    name: "Gretchen",
  },
];

function WritersPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <Link className="mb-8 inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80" to="/">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <div className="mb-16 text-center">
        <h1 className="mb-8 text-4xl font-black leading-tight md:text-6xl">Meet Our Writers!</h1>
        <div className="mx-auto mb-8 h-1 w-24 bg-[#7CFC00]"></div>
        <p className="mb-4 text-xl font-medium text-gray-300">Dead Party Media</p>
        <p className="text-lg text-gray-400">
          From all around Arkansas, meet our team of writers that want to keep YOU up-to-date with
          all things local music.
        </p>
      </div>

      <div className="space-y-16">
        {writers.map((writer) => (
          <div className="border-b border-gray-800 pb-16 last:border-b-0" key={writer.name}>
            <h2 className="mb-4 text-2xl font-bold">
              {writer.category} – {writer.name}
            </h2>
            <p className="mb-4 leading-relaxed text-gray-300">{writer.bio}</p>
            <p className="mb-2 text-gray-400">Cash tag: {writer.cashTag}</p>
          </div>
        ))}

        <div className="border-b border-gray-800 pb-16">
          <h2 className="mb-4 text-2xl font-bold">Hardcore & Rock –</h2>
          <p className="text-gray-400">Coming Soon!</p>
        </div>

        <div className="border-b border-gray-800 pb-16 last:border-b-0">
          <h2 className="mb-4 text-2xl font-bold">Hip-Hop & R&B –</h2>
          <p className="text-gray-400">Coming Soon!</p>
        </div>
      </div>
    </main>
  );
}
