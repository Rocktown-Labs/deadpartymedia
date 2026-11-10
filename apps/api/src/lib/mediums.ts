import { artworks } from "@dpmedia/db/d1/schema";
import { sql } from "drizzle-orm";

/**
 * Medium groups for the public artwork wall, ported from
 * apps/arts/src/lib/mediums.ts. The lucide `icon` components are UI-only
 * and stay in the frontend; the API only needs slug + keyword data.
 *
 * Grouping order matters: the SQL assignment below tests groups in
 * MEDIUM_GROUPS order and the first keyword hit wins; anything unmatched
 * (including a blank medium) lands in mixed-practice, which is also the
 * card label fallback. Generated from the same MEDIUM_GROUPS table the
 * JS-side getMediumGroupForMedium uses, so the counts and the filter can
 * never drift apart.
 */

export const MEDIUM_GROUPS = [
  {
    description: "Acrylic, oil, watercolor, gouache, murals, window painting, and mixed media.",
    label: "Painting",
    mediums: ["Acrylic", "Oil", "Painting", "Watercolor", "Gouache", "Murals", "Window Painting"],
    slug: "painting",
  },
  {
    description: "Digital art, illustration, graphic design, photography, and video work.",
    label: "Digital",
    mediums: [
      "Digital",
      "Digital Art",
      "Digital Illustration",
      "Digital Painting",
      "Graphic Design",
      "Illustration",
      "Photography",
      "Videography",
    ],
    slug: "digital",
  },
  {
    description:
      "Clothing design, fashion, crochet, textiles, fiber arts, tie dye, and tapestries.",
    label: "Clothing",
    mediums: [
      "Clothing",
      "Clothing Design",
      "Fashion",
      "Crochet",
      "Textiles",
      "Fiber Arts",
      "Tie Dye",
      "Tapestries",
    ],
    slug: "clothing",
  },
  {
    description: "Ceramics, sculpture, jewelry, paper, vinyl, fabric, and object-based work.",
    label: "Objects",
    mediums: ["Objects", "Ceramics", "Sculpture", "Jewelry", "Paper", "Vinyl", "Fabric"],
    slug: "objects",
  },
  {
    description:
      "Charcoal, graphite, colored pencil, pen, pencil, pastels, and traditional drawing.",
    label: "Drawing",
    mediums: ["Charcoal", "Graphite", "Colored Pencil", "Pen and Pencil", "Pastels", "Drawing"],
    slug: "drawing",
  },
  {
    description:
      "Tattooing, collage, glitter, multidisciplinary work, and beautiful category-breakers.",
    label: "Mixed Practice",
    mediums: ["Mixed Practice", "Tattoo", "Collage", "Glitter", "Mixed Media", "Multidisciplinary"],
    slug: "mixed-practice",
  },
] as const;

export type MediumGroupSlug = (typeof MEDIUM_GROUPS)[number]["slug"];

export function getMediumGroup(slug: string) {
  return MEDIUM_GROUPS.find((group) => group.slug === slug) ?? null;
}

// Assign every published artwork to exactly ONE medium group so the category
// counts add up to the total (issue #129). Ported from
// apps/arts/src/lib/artworks.functions.ts#buildMediumGroupSql.
export function buildMediumGroupSql() {
  const cases = MEDIUM_GROUPS.map((group) => {
    const keywordMatches = group.mediums.map(
      (keyword) => sql`coalesce(${artworks.medium}, '') like ${`%${keyword}%`}`,
    );
    // Slugs come from our own MEDIUM_GROUPS constant; inline them as literals
    // so the CASE branches never rely on Postgres inferring parameter types.
    const slugLiteral = sql.raw(`'${group.slug}'`);
    return sql`when ${sql.join(keywordMatches, sql` or `)} then ${slugLiteral}`;
  });
  const fallback = MEDIUM_GROUPS.at(-1)?.slug ?? "mixed-practice";
  return sql`case ${sql.join(cases, sql` `)} else ${sql.raw(`'${fallback}'`)} end`;
}

export const MEDIUM_GROUP_SQL = buildMediumGroupSql();
