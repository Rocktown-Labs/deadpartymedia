import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  serial,
  type AnyPgColumn,
  index,
  uniqueIndex,
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

export const roleEnum = pgEnum("role", [
  "artist",
  "fan",
  "super_admin",
  "writer",
]);

// Users Table (synced from Clerk)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique().notNull(), // Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  role: roleEnum("role").notNull().default("fan"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
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

// Article Comments Table
export const articleComments = pgTable(
  "article_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    userName: text("user_name"),
    userEmail: text("user_email"),
    content: text("content").notNull(),
    parentId: integer("parent_id").references((): AnyPgColumn => articleComments.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    postIdIdx: index("article_comments_post_id_idx").on(table.postId),
    parentIdIdx: index("article_comments_parent_id_idx").on(table.parentId),
    clerkUserIdIdx: index("article_comments_clerk_user_id_idx").on(
      table.clerkUserId,
    ),
    clerkUserCreatedAtIdx: index("article_comments_user_created_at_idx").on(
      table.clerkUserId,
      table.createdAt,
    ),
  }),
);

// User Article Reads Table
export const userArticleReads = pgTable(
  "user_article_reads",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_article_reads_user_idx").on(table.clerkUserId),
    userPostUnique: uniqueIndex("user_article_reads_user_post_unique").on(
      table.clerkUserId,
      table.postId,
    ),
  }),
);

// User Article Saves Table
export const userArticleSaves = pgTable(
  "user_article_saves",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("user_article_saves_user_idx").on(table.clerkUserId),
    userPostUnique: uniqueIndex("user_article_saves_user_post_unique").on(
      table.clerkUserId,
      table.postId,
    ),
  }),
);

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
  comments: many(articleComments),
  reads: many(userArticleReads),
  saves: many(userArticleSaves),
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

export const articleCommentsRelations = relations(articleComments, ({ one, many }) => ({
  post: one(posts, {
    fields: [articleComments.postId],
    references: [posts.id],
  }),
  parent: one(articleComments, {
    fields: [articleComments.parentId],
    references: [articleComments.id],
    relationName: "comment_replies",
  }),
  replies: many(articleComments, {
    relationName: "comment_replies",
  }),
}));

export const userArticleReadsRelations = relations(userArticleReads, ({ one }) => ({
  post: one(posts, {
    fields: [userArticleReads.postId],
    references: [posts.id],
  }),
}));

export const userArticleSavesRelations = relations(userArticleSaves, ({ one }) => ({
  post: one(posts, {
    fields: [userArticleSaves.postId],
    references: [posts.id],
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
