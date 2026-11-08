import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface HomeArticle {
  author: string;
  category: string;
  cover_image?: string | null;
  date: string;
  excerpt: string;
  id: number;
  slug: string;
  title: string;
}

export interface HomeEvent {
  artists: { name: string }[];
  date: string;
  id: number;
  slug: string;
  title: string;
  venue: string;
}

export interface HomeRelease {
  artistName: string;
  coverArt: string | null;
  id: number;
  releaseType: "Single" | "Album" | "EP";
  slug: string;
  title: string;
}

export interface HomeProduct {
  featuredImage: { url: string } | null;
  handle: string;
  id: string;
  title: string;
  variants: { price: { amount: string; currencyCode: string } }[];
}

/** Article spotlight: 1 hero + 2-3 secondary cards (source pattern). */
export function ArticleSpotlight({
  hero,
  secondary,
}: {
  hero: HomeArticle | undefined;
  secondary: HomeArticle[];
}) {
  if (!hero) {
    return null;
  }
  return (
    <section className="mb-14">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          className="group col-span-1 lg:col-span-2 lg:row-span-2"
          params={{ slug: hero.slug }}
          to="/article/$slug"
        >
          <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors group-hover:border-[#7CFC00]/40">
            {hero.cover_image ? (
              <div className="aspect-video overflow-hidden">
                <img
                  alt={hero.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  src={hero.cover_image}
                />
              </div>
            ) : null}
            <CardHeader>
              <Badge className="mb-2 w-fit bg-[#7CFC00]/15 text-[#7CFC00]" variant="secondary">
                {hero.category}
              </Badge>
              <CardTitle className="text-2xl font-black leading-tight group-hover:text-[#7CFC00] lg:text-4xl">
                {hero.title}
              </CardTitle>
              <p className="line-clamp-2 text-sm text-gray-400">{hero.excerpt}</p>
              <p className="text-xs text-gray-500">
                {hero.author} | {hero.date}
              </p>
            </CardHeader>
          </Card>
        </Link>

        <div className="col-span-1 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {secondary.map((article) => (
            <Link
              className="group"
              key={article.id}
              params={{ slug: article.slug }}
              to="/article/$slug"
            >
              <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors group-hover:border-[#7CFC00]/40">
                <CardContent className="flex flex-col gap-2 p-4">
                  <Badge className="w-fit bg-[#7CFC00]/10 text-[#7CFC00]" variant="secondary">
                    {article.category}
                  </Badge>
                  <h3 className="font-bold leading-tight group-hover:text-[#7CFC00]">
                    {article.title}
                  </h3>
                  <p className="line-clamp-2 text-xs text-gray-400">{article.excerpt}</p>
                  <p className="text-xs text-gray-600">{article.date}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Recent articles card grid. */
export function ArticleGrid({ articles }: { articles: HomeArticle[] }) {
  if (articles.length === 0) {
    return null;
  }
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-2xl font-black">Recent Articles</h2>
        <Link
          className="flex items-center gap-1 text-sm text-[#7CFC00] hover:underline"
          to="/articles"
        >
          All articles <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.id}>
            <Link className="group" params={{ slug: article.slug }} to="/article/$slug">
              <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors group-hover:border-[#7CFC00]/40">
                {article.cover_image ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      alt={article.title}
                      className="h-full w-full object-cover"
                      src={article.cover_image}
                    />
                  </div>
                ) : null}
                <CardContent className="p-4">
                  <Badge className="mb-2 bg-[#7CFC00]/10 text-[#7CFC00]" variant="secondary">
                    {article.category}
                  </Badge>
                  <h3 className="mb-1 font-bold leading-tight group-hover:text-[#7CFC00]">
                    {article.title}
                  </h3>
                  <p className="line-clamp-2 text-xs text-gray-400">{article.excerpt}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    {article.author} | {article.date}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Upcoming shows strip. */
export function ShowsStrip({ events }: { events: HomeEvent[] }) {
  if (events.length === 0) {
    return null;
  }
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-2xl font-black">Upcoming Shows</h2>
        <Link
          className="flex items-center gap-1 text-sm text-[#7CFC00] hover:underline"
          to="/events"
        >
          All events <Calendar className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">Venue</th>
              <th className="px-4 py-2.5 font-medium">Lineup</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 8).map((event) => (
              <tr className="border-b border-white/5 last:border-b-0" key={event.id}>
                <td className="px-4 py-2.5 font-mono text-[#7CFC00]">{event.date}</td>
                <td className="px-4 py-2.5 font-semibold">
                  <Link
                    className="hover:text-[#7CFC00]"
                    params={{ slug: event.slug }}
                    to="/events/$slug"
                  >
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-400">{event.venue}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {event.artists.map((artist) => artist.name).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Music releases grid. */
export function MusicSection({ releases }: { releases: HomeRelease[] }) {
  if (releases.length === 0) {
    return null;
  }
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-2xl font-black">New Music</h2>
        <Link
          className="flex items-center gap-1 text-sm text-[#7CFC00] hover:underline"
          to="/music"
        >
          All releases <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {releases.slice(0, 5).map((release) => (
          <li key={release.id}>
            <Link className="group" params={{ slug: release.slug }} to="/music/$slug">
              <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors group-hover:border-[#7CFC00]/40">
                {release.coverArt ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      alt={release.title}
                      className="h-full w-full object-cover"
                      src={release.coverArt}
                    />
                  </div>
                ) : null}
                <CardContent className="p-3">
                  <Badge className="mb-1 bg-[#7CFC00]/10 text-[#7CFC00]" variant="secondary">
                    {release.releaseType}
                  </Badge>
                  <h3 className="text-sm font-bold leading-tight group-hover:text-[#7CFC00]">
                    {release.title}
                  </h3>
                  <p className="text-xs text-gray-500">{release.artistName}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Merch grid. */
export function MerchSection({ products }: { products: HomeProduct[] }) {
  if (products.length === 0) {
    return null;
  }
  return (
    <section className="mb-14">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-2xl font-black">Merch</h2>
        <Link
          className="flex items-center gap-1 text-sm text-[#7CFC00] hover:underline"
          to="/merch"
        >
          Shop all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {products.slice(0, 5).map((product) => {
          const variant = product.variants[0];
          const amount = variant ? Number.parseFloat(variant.price.amount) : undefined;
          return (
            <li key={product.id}>
              <Link params={{ handle: product.handle }} to="/merch/$handle">
                <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors hover:border-[#7CFC00]/40">
                  {product.featuredImage ? (
                    <div className="aspect-square overflow-hidden">
                      <img
                        alt={product.title}
                        className="h-full w-full object-cover"
                        src={product.featuredImage.url}
                      />
                    </div>
                  ) : null}
                  <CardContent className="p-3">
                    <h3 className="text-sm font-bold">{product.title}</h3>
                    {amount !== undefined && Number.isFinite(amount) ? (
                      <p className="text-xs text-[#7CFC00]">
                        {variant?.price.currencyCode} {amount.toFixed(2)}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
