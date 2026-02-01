import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const categoryEnum = pgEnum("category", [
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
]);

export const genreEnum = pgEnum("genre", [
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "past",
]);

// Users Table (synced from Clerk)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique().notNull(), // Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Posts Table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: categoryEnum("category").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(), // JSON string for Tiptap content
  coverImage: text("cover_image"),
  authorId: text("author_id").notNull(), // Clerk user ID
  status: postStatusEnum("status").notNull().default("draft"),
  isCoverStory: boolean("is_cover_story").notNull().default(false),
  publishedAt: timestamp("published_at"),
  views: integer("views").notNull().default(0),
  deleteRequested: boolean("delete_requested").notNull().default(false),
  deleteRequestedAt: timestamp("delete_requested_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Events Table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  image: text("image"),
  venue: text("venue").notNull(),
  location: text("location").notNull(),
  date: date("date").notNull(),
  time: text("time"),
  ticketLink: text("ticket_link"),
  price: text("price"),
  genre: genreEnum("genre").notNull(),
  status: eventStatusEnum("status").notNull().default("draft"),
  createdById: text("created_by_id").notNull(), // Clerk user ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Artists Table
export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  image: text("image"),
  location: text("location").notNull(),
  genre: genreEnum("genre").notNull(),
  spotifyUrl: text("spotify_url"),
  spotifyArtistId: text("spotify_artist_id"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  tiktok: text("tiktok"),
  website: text("website"),
  email: text("email"), // Email for sending claim invitation
  phoneNumber: text("phone_number"),
  claimed: boolean("claimed").notNull().default(false),
  claimedById: text("claimed_by_id"), // Clerk user ID of artist who claimed
  profileViews: integer("profile_views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Post-Artist Relations Table (many-to-many)
export const postArtists = pgTable("post_artists", {
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
});

// Event-Artist Relations Table (many-to-many)
export const eventArtists = pgTable("event_artists", {
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
});

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  postArtists: many(postArtists),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  eventArtists: many(eventArtists),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  postArtists: many(postArtists),
  eventArtists: many(eventArtists),
}));

export const postArtistsRelations = relations(postArtists, ({ one }) => ({
  post: one(posts, {
    fields: [postArtists.postId],
    references: [posts.id],
  }),
  artist: one(artists, {
    fields: [postArtists.artistId],
    references: [artists.id],
  }),
}));

export const eventArtistsRelations = relations(eventArtists, ({ one }) => ({
  event: one(events, {
    fields: [eventArtists.eventId],
    references: [events.id],
  }),
  artist: one(artists, {
    fields: [eventArtists.artistId],
    references: [artists.id],
  }),
}));
