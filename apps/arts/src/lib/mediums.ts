import { Palette, Shirt, Sparkles, Gem, Camera, Scissors } from "lucide-react";

export const MEDIUM_GROUPS = [
  {
    description: "Acrylic, oil, watercolor, gouache, murals, window painting, and mixed media.",
    icon: Palette,
    label: "Painting",
    mediums: ["Acrylic", "Oil", "Watercolor", "Gouache", "Murals", "Painting", "Window Painting"],
    slug: "painting",
  },
  {
    description: "Digital art, illustration, graphic design, photography, and video work.",
    icon: Camera,
    label: "Digital",
    mediums: [
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
    icon: Shirt,
    label: "Clothing",
    mediums: [
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
    icon: Gem,
    label: "Objects",
    mediums: ["Ceramics", "Sculpture", "Jewelry", "Paper", "Vinyl", "Fabric"],
    slug: "objects",
  },
  {
    description:
      "Charcoal, graphite, colored pencil, pen, pencil, pastels, and traditional drawing.",
    icon: Scissors,
    label: "Drawing",
    mediums: ["Charcoal", "Graphite", "Colored Pencil", "Pen and Pencil", "Pastels", "Drawing"],
    slug: "drawing",
  },
  {
    description:
      "Tattooing, collage, glitter, multidisciplinary work, and beautiful category-breakers.",
    icon: Sparkles,
    label: "Mixed Practice",
    mediums: ["Tattoo", "Collage", "Glitter", "Mixed Media", "Multidisciplinary"],
    slug: "mixed-practice",
  },
] as const;

export type MediumGroupSlug = (typeof MEDIUM_GROUPS)[number]["slug"];

export function getMediumGroup(slug: string) {
  return MEDIUM_GROUPS.find((group) => group.slug === slug) ?? null;
}

export function getMediumGroupForMedium(medium: string) {
  const normalized = medium.toLowerCase();
  return (
    MEDIUM_GROUPS.find((group) =>
      group.mediums.some((candidate) => normalized.includes(candidate.toLowerCase())),
    ) ?? MEDIUM_GROUPS.at(-1)
  );
}
