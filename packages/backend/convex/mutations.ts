import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Create artist
export const createArtist = mutation({
  args: {
    name: v.string(),
    bio: v.string(),
    image: v.string(),
    location: v.string(),
    genre: v.union(
      v.literal("Country"),
      v.literal("EDM"),
      v.literal("Hardcore & Rock"),
      v.literal("Hip-Hop & R&B"),
      v.literal("Other")
    ),
    spotifyUrl: v.optional(v.string()),
    spotifyArtistId: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = generateSlug(args.name);
    
    return await ctx.db.insert("artists", {
      slug,
      name: args.name,
      bio: args.bio,
      image: args.image,
      location: args.location,
      genre: args.genre,
      spotifyUrl: args.spotifyUrl,
      spotifyArtistId: args.spotifyArtistId,
      instagram: args.instagram,
      twitter: args.twitter,
      tiktok: args.tiktok,
      website: args.website,
      claimed: false,
      articleCount: 0,
      profileViews: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Create article
export const createArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.union(
      v.literal("Country"),
      v.literal("EDM"),
      v.literal("Hardcore & Rock"),
      v.literal("Hip-Hop & R&B"),
      v.literal("Other")
    ),
    excerpt: v.string(),
    content: v.string(),
    coverImage: v.string(),
    authorId: v.id("users"),
    authorName: v.string(),
    artistIds: v.array(v.id("artists")),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    const articleId = await ctx.db.insert("articles", {
      slug: args.slug,
      title: args.title,
      category: args.category,
      excerpt: args.excerpt,
      content: args.content,
      coverImage: args.coverImage,
      authorId: args.authorId,
      authorName: args.authorName,
      artistIds: args.artistIds,
      status: args.status,
      publishedAt: args.status === "published" ? Date.now() : undefined,
      views: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create article-artist relations
    for (const artistId of args.artistIds) {
      await ctx.db.insert("articleArtists", {
        articleId,
        artistId,
        createdAt: Date.now(),
      });
    }

    return articleId;
  },
});

// Create event
export const createEvent = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    image: v.string(),
    venue: v.string(),
    location: v.string(),
    date: v.number(),
    time: v.string(),
    ticketLink: v.optional(v.string()),
    price: v.optional(v.string()),
    genre: v.union(
      v.literal("Country"),
      v.literal("EDM"),
      v.literal("Hardcore & Rock"),
      v.literal("Hip-Hop & R&B"),
      v.literal("Other")
    ),
    artistIds: v.array(v.id("artists")),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      slug: args.slug,
      title: args.title,
      description: args.description,
      image: args.image,
      venue: args.venue,
      location: args.location,
      date: args.date,
      time: args.time,
      ticketLink: args.ticketLink,
      price: args.price,
      genre: args.genre,
      artistIds: args.artistIds,
      status: args.status,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

