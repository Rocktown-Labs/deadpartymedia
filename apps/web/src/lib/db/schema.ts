import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  pgEnum,
  serial,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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

export const postStatusEnum = pgEnum("post_status", ["draft", "published", "archived"]);

export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "past"]);

export const roleEnum = pgEnum("role", [
  "artist",
  "artmaker",
  "arts_admin",
  "arts_writer",
  "fan",
  "super_admin",
  "venue",
  "writer",
]);

export const contentVerticalEnum = pgEnum("content_vertical", ["music", "arts"]);

// Users Table (synced from Clerk)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Clerk user ID
  clerkId: text("clerk_id").unique().notNull(),
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
  // JSON string for Tiptap content
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  // Clerk user ID
  authorId: text("author_id").notNull(),
  status: postStatusEnum("status").notNull().default("draft"),
  vertical: contentVerticalEnum("vertical").notNull().default("music"),
  isCoverStory: boolean("is_cover_story").notNull().default(false),
  publishedAt: timestamp("published_at"),
  views: integer("views").notNull().default(0),
  deleteRequested: boolean("delete_requested").notNull().default(false),
  deleteRequestedAt: timestamp("delete_requested_at"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Article Comments Table
export const articleComments = pgTable(
  "article_comments",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    id: serial("id").primaryKey(),
    parentId: integer("parent_id").references((): AnyPgColumn => articleComments.id, {
      onDelete: "cascade",
    }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    userEmail: text("user_email"),
    userName: text("user_name"),
  },
  (table) => ({
    clerkUserCreatedAtIdx: index("article_comments_user_created_at_idx").on(
      table.clerkUserId,
      table.createdAt,
    ),
    clerkUserIdIdx: index("article_comments_clerk_user_id_idx").on(table.clerkUserId),
    parentIdIdx: index("article_comments_parent_id_idx").on(table.parentId),
    postIdIdx: index("article_comments_post_id_idx").on(table.postId),
  }),
);

// User Article Reads Table
export const userArticleReads = pgTable(
  "user_article_reads",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    id: serial("id").primaryKey(),
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
    clerkUserId: text("clerk_user_id").notNull(),
    id: serial("id").primaryKey(),
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
  vertical: contentVerticalEnum("vertical").notNull().default("music"),
  status: eventStatusEnum("status").notNull().default("draft"),
  // Clerk user ID
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Venues Table
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  city: text("city").notNull().default("Little Rock"),
  state: text("state").notNull().default("AR"),
  zip: text("zip"),
  website: text("website"),
  phone: text("phone"),
  capacity: text("capacity"),
  description: text("description"),
  claimedById: text("claimed_by_id"),
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
  // Email for sending claim invitation
  email: text("email"),
  phoneNumber: text("phone_number"),
  claimed: boolean("claimed").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  // Clerk user ID of artist who claimed
  claimedById: text("claimed_by_id"),
  profileViews: integer("profile_views").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const artmakerStatusEnum = pgEnum("artmaker_status", ["draft", "published", "hidden"]);

export const artworkStatusEnum = pgEnum("artwork_status", ["draft", "published", "archived"]);

export const artmakers = pgTable(
  "artmakers",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("AR"),
    pronouns: text("pronouns"),
    showPronouns: boolean("show_pronouns").notNull().default(false),
    phoneNumber: text("phone_number").notNull(),
    medium: text("medium").array().notNull().default([]),
    instagramUsername: text("instagram_username").notNull(),
    instagramUrl: text("instagram_url").notNull(),
    bio: text("bio"),
    image: text("image"),
    claimed: boolean("claimed").notNull().default(true),
    hidden: boolean("hidden").notNull().default(false),
    status: artmakerStatusEnum("status").notNull().default("published"),
    profileViews: integer("profile_views").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    cityStateIdx: index("artmakers_city_state_idx").on(table.city, table.state),
    clerkUserIdUnique: uniqueIndex("artmakers_clerk_user_id_unique").on(table.clerkUserId),
    slugUnique: uniqueIndex("artmakers_slug_unique").on(table.slug),
    statusIdx: index("artmakers_status_idx").on(table.status),
  }),
);

export const artworks = pgTable(
  "artworks",
  {
    id: serial("id").primaryKey(),
    artmakerId: integer("artmaker_id")
      .notNull()
      .references(() => artmakers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    image: text("image").notNull(),
    description: text("description"),
    medium: text("medium"),
    year: text("year"),
    status: artworkStatusEnum("status").notNull().default("published"),
    forSale: boolean("for_sale").notNull().default(false),
    priceCents: integer("price_cents"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    artmakerIdx: index("artworks_artmaker_id_idx").on(table.artmakerId),
    slugUnique: uniqueIndex("artworks_slug_unique").on(table.slug),
    statusIdx: index("artworks_status_idx").on(table.status),
  }),
);

// Post-Artist Relations Table (many-to-many)
export const postArtists = pgTable("post_artists", {
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
});

export const postArtmakers = pgTable("post_artmakers", {
  artmakerId: integer("artmaker_id")
    .notNull()
    .references(() => artmakers.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
});

// Event-Artist Relations Table (many-to-many)
export const eventArtists = pgTable("event_artists", {
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
});

export const eventArtmakers = pgTable("event_artmakers", {
  artmakerId: integer("artmaker_id")
    .notNull()
    .references(() => artmakers.id, { onDelete: "cascade" }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
});

// Post Import Source Metadata (WordPress backfill traceability)
export const postImportSources = pgTable(
  "post_import_sources",
  {
    id: serial("id").primaryKey(),
    importedAt: timestamp("imported_at").notNull().defaultNow(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sourceAuthorSlug: text("source_author_slug").notNull(),
    sourceCategoriesJson: text("source_categories_json").notNull(),
    sourceModifiedAt: timestamp("source_modified_at"),
    sourcePublishedAt: timestamp("source_published_at").notNull(),
    sourceUrl: text("source_url").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    postIdUnique: uniqueIndex("post_import_sources_post_id_unique").on(table.postId),
    sourceAuthorSlugIdx: index("post_import_sources_source_author_slug_idx").on(
      table.sourceAuthorSlug,
    ),
    sourceUrlUnique: uniqueIndex("post_import_sources_source_url_unique").on(table.sourceUrl),
  }),
);

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  comments: many(articleComments),
  importSources: many(postImportSources),
  postArtmakers: many(postArtmakers),
  postArtists: many(postArtists),
  reads: many(userArticleReads),
  saves: many(userArticleSaves),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  eventArtmakers: many(eventArtmakers),
  eventArtists: many(eventArtists),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  eventArtists: many(eventArtists),
  postArtists: many(postArtists),
}));

export const artmakersRelations = relations(artmakers, ({ many }) => ({
  artworks: many(artworks),
  eventArtmakers: many(eventArtmakers),
  postArtmakers: many(postArtmakers),
}));

export const postArtistsRelations = relations(postArtists, ({ one }) => ({
  artist: one(artists, {
    fields: [postArtists.artistId],
    references: [artists.id],
  }),
  post: one(posts, {
    fields: [postArtists.postId],
    references: [posts.id],
  }),
}));

export const postArtmakersRelations = relations(postArtmakers, ({ one }) => ({
  artmaker: one(artmakers, {
    fields: [postArtmakers.artmakerId],
    references: [artmakers.id],
  }),
  post: one(posts, {
    fields: [postArtmakers.postId],
    references: [posts.id],
  }),
}));

export const articleCommentsRelations = relations(articleComments, ({ one, many }) => ({
  parent: one(articleComments, {
    fields: [articleComments.parentId],
    references: [articleComments.id],
    relationName: "comment_replies",
  }),
  post: one(posts, {
    fields: [articleComments.postId],
    references: [posts.id],
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
  artist: one(artists, {
    fields: [eventArtists.artistId],
    references: [artists.id],
  }),
  event: one(events, {
    fields: [eventArtists.eventId],
    references: [events.id],
  }),
}));

export const eventArtmakersRelations = relations(eventArtmakers, ({ one }) => ({
  artmaker: one(artmakers, {
    fields: [eventArtmakers.artmakerId],
    references: [artmakers.id],
  }),
  event: one(events, {
    fields: [eventArtmakers.eventId],
    references: [events.id],
  }),
}));

export const artworksRelations = relations(artworks, ({ one }) => ({
  artmaker: one(artmakers, {
    fields: [artworks.artmakerId],
    references: [artmakers.id],
  }),
}));

export const postImportSourcesRelations = relations(postImportSources, ({ one }) => ({
  post: one(posts, {
    fields: [postImportSources.postId],
    references: [posts.id],
  }),
}));

export const backfillRuns = pgTable("backfill_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  // status can be 'running', 'completed', or 'failed'
  status: text("status").notNull(),
  totalPosts: integer("total_posts").notNull().default(0),
  processedPosts: integer("processed_posts").notNull().default(0),
  results: jsonb("results"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
