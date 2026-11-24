import { Camera, Gem, Monitor, Palette, Pen, Shirt, Sparkles } from "lucide-react";

export const MEDIUM_GROUPS = [
  {
    description: "Acrylic, oil, watercolor, gouache, murals, window painting, and mixed media.",
    icon: Palette,
    label: "Painting",
    mediums: ["Acrylic", "Oil", "Painting", "Watercolor", "Gouache", "Murals", "Window Painting"],
    slug: "painting",
  },
  {
    description: "Photography, videography, film, documentary, portraits, and motion work.",
    icon: Camera,
    label: "Photography / Videography",
    mediums: [
      "Photography / Videography",
      "Photography/Videography",
      "Photography",
      "Videography",
      "Photo",
      "Video",
      "Film",
      "Cinematography",
    ],
    slug: "photography-videography",
  },
  {
    description: "Digital art, illustration, graphic design, 3D, and screen-based work.",
    icon: Monitor,
    label: "Digital",
    mediums: [
      "Digital",
      "Digital Art",
      "Digital Illustration",
      "Digital Painting",
      "Graphic Design",
      "Illustration",
    ],
    slug: "digital",
  },
  {
    description:
      "Clothing design, fashion, crochet, textiles, fiber arts, tie dye, and tapestries.",
    icon: Shirt,
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
    icon: Gem,
    label: "Objects",
    mediums: ["Objects", "Ceramics", "Sculpture", "Jewelry", "Paper", "Vinyl", "Fabric"],
    slug: "objects",
  },
  {
    description:
      "Charcoal, graphite, colored pencil, pen, pencil, pastels, and traditional drawing.",
    icon: Pen,
    label: "Drawing",
    mediums: ["Charcoal", "Graphite", "Colored Pencil", "Pen and Pencil", "Pastels", "Drawing"],
    slug: "drawing",
  },
  {
    description:
      "Tattooing, collage, glitter, multidisciplinary work, and beautiful category-breakers.",
    icon: Sparkles,
    label: "Mixed Practice",
    mediums: ["Mixed Practice", "Tattoo", "Collage", "Glitter", "Mixed Media", "Multidisciplinary"],
    slug: "mixed-practice",
  },
] as const;

export type MediumGroupSlug = (typeof MEDIUM_GROUPS)[number]["slug"];

export function getMediumGroup(slug: string) {
  return MEDIUM_GROUPS.find((group) => group.slug === slug) ?? null;
}

// Grouping order matters: getMediumGroupForMedium returns the FIRST group
// whose keyword matches, so every artwork lands in exactly one category and
// per-category counts sum to the total (issue #129).
const FALLBACK_MEDIUM_GROUP = MEDIUM_GROUPS[MEDIUM_GROUPS.length - 1];

export function getMediumGroupForMedium(medium: string) {
  const normalized = medium.toLowerCase();
  return (
    MEDIUM_GROUPS.find((group) =>
      group.mediums.some((candidate) => normalized.includes(candidate.toLowerCase())),
    ) ?? FALLBACK_MEDIUM_GROUP
  );
}
