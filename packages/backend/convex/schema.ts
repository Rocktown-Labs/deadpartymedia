import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - extends better-auth user data
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("admin"),
      v.literal("writer"),
      v.literal("artist"),
      v.literal("fan")
    ),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
    artistProfileId: v.optional(v.id("artists")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Articles table
  articles: defineTable({
    slug: v.string(),
    title: v.string(),
    category: v.union(
      v.literal("Country"),
      v.literal("EDM"),
      v.literal("Hardcore & Rock"),
      v.literal("Hip-Hop & R&B"),
      v.literal("Other")
    ),
    excerpt: v.string(),
    content: v.string(), // Rich text HTML from Novel editor
    coverImage: v.string(),
    authorId: v.id("users"),
    authorName: v.string(),
    artistIds: v.array(v.id("artists")),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    publishedAt: v.optional(v.number()),
    views: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"]),

  // Events table
  events: defineTable({
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
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("past")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_genre", ["genre"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  // Artists table
  artists: defineTable({
    slug: v.string(),
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
    claimed: v.boolean(),
    claimedBy: v.optional(v.id("users")),
    articleCount: v.number(),
    profileViews: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_genre", ["genre"])
    .index("by_claimed", ["claimed"]),

  // Writers table (linked to users)
  writers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    bio: v.string(),
    image: v.string(),
    role: v.string(),
    twitter: v.optional(v.string()),
    instagram: v.optional(v.string()),
    articleCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Article-Artist Relations (many-to-many)
  articleArtists: defineTable({
    articleId: v.id("articles"),
    artistId: v.id("artists"),
    createdAt: v.number(),
  })
    .index("by_article", ["articleId"])
    .index("by_artist", ["artistId"]),
});
