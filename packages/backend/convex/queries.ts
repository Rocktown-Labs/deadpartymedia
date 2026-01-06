import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all artists
export const getArtists = query({
  args: {
    genre: v.optional(
      v.union(
        v.literal("Country"),
        v.literal("EDM"),
        v.literal("Hardcore & Rock"),
        v.literal("Hip-Hop & R&B"),
        v.literal("Other")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.genre) {
      return await ctx.db
        .query("artists")
        .withIndex("by_genre", (q) => q.eq("genre", args.genre!))
        .collect();
    }
    return await ctx.db.query("artists").collect();
  },
});

// Get all writers
export const getWriters = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("writers").collect();
  },
});

// Get all articles
export const getArticles = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("articles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("articles").collect();
  },
});

// Get all events
export const getEvents = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("past"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("events")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("events").collect();
  },
});

