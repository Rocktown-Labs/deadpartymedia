// Native SQLite schema; application ownership is isolated by separate D1 bindings.
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Enums
export const categoryEnumValues = [
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
] as const;

export const genreEnumValues = [
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
] as const;

export const postStatusEnumValues = ["draft", "published", "archived"] as const;

export const eventStatusEnumValues = ["draft", "published", "past"] as const;

export const roleEnumValues = [
  "artist",
  "artmaker",
  "arts_admin",
  "arts_writer",
  "fan",
  "super_admin",
  "venue",
  "writer",
] as const;

export const contentVerticalEnumValues = ["music", "arts"] as const;

// Users Table (synced from Clerk)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Clerk user ID
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  role: text("role", { enum: roleEnumValues }).notNull().default("fan"),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

// Posts Table
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category", { enum: categoryEnumValues }).notNull(),
  excerpt: text("excerpt").notNull(),
  // JSON string for Tiptap content
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  // Clerk user ID
  authorId: text("author_id").notNull(),
  status: text("status", { enum: postStatusEnumValues }).notNull().default("draft"),
  vertical: text("vertical", { enum: contentVerticalEnumValues }).notNull().default("music"),
  isCoverStory: integer("is_cover_story", { mode: "boolean" }).notNull().default(false),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  views: integer("views").notNull().default(0),
  deleteRequested: integer("delete_requested", { mode: "boolean" }).notNull().default(false),
  deleteRequestedAt: integer("delete_requested_at", { mode: "timestamp_ms" }),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

// Article Comments Table
export const articleComments = sqliteTable(
  "article_comments",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references((): AnySQLiteColumn => articleComments.id, {
      onDelete: "cascade",
    }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
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
export const userArticleReads = sqliteTable(
  "user_article_reads",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    readAt: integer("read_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
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
export const userArticleSaves = sqliteTable(
  "user_article_saves",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    savedAt: integer("saved_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
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
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  image: text("image"),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
  venue: text("venue").notNull(),
  location: text("location").notNull(),
  date: text("date").notNull(),
  time: text("time"),
  ticketLink: text("ticket_link"),
  price: text("price"),
  genre: text("genre", { enum: genreEnumValues }).notNull(),
  vertical: text("vertical", { enum: contentVerticalEnumValues }).notNull().default("music"),
  status: text("status", { enum: eventStatusEnumValues }).notNull().default("draft"),
  // Clerk user ID
  createdById: text("created_by_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

// Venues Table
export const venues = sqliteTable("venues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address"),
  city: text("city").notNull().default("Little Rock"),
  state: text("state").notNull().default("AR"),
  zip: text("zip"),
  website: text("website"),
  phone: text("phone"),
  capacity: text("capacity"),
  genres: text("genres"),
  description: text("description"),
  bookingRates: text("booking_rates"),
  bookingEmail: text("booking_email"),
  image: text("image"),
  claimedById: text("claimed_by_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

// Artists Table
export const artists = sqliteTable("artists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  image: text("image"),
  location: text("location").notNull(),
  genre: text("genre", { enum: genreEnumValues }).notNull(),
  spotifyUrl: text("spotify_url"),
  spotifyArtistId: text("spotify_artist_id"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  tiktok: text("tiktok"),
  website: text("website"),
  // Email for sending claim invitation
  email: text("email"),
  phoneNumber: text("phone_number"),
  claimed: integer("claimed", { mode: "boolean" }).notNull().default(false),
  hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
  // Clerk user ID of artist who claimed
  claimedById: text("claimed_by_id"),
  profileViews: integer("profile_views").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

// Music Releases Table
export const musicReleases = sqliteTable(
  "music_releases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    artistName: text("artist_name").notNull(),
    artistId: integer("artist_id").references(() => artists.id, { onDelete: "set null" }),
    releaseType: text("release_type").notNull().default("Single"),
    genre: text("genre", { enum: genreEnumValues }).notNull().default("OTHER"),
    releaseDate: text("release_date"),
    coverArt: text("cover_art"),
    audioUrl: text("audio_url"),
    excerpt: text("excerpt").notNull(),
    content: text("content"),
    spotifyUrl: text("spotify_url"),
    appleMusicUrl: text("apple_music_url"),
    bandcampUrl: text("bandcamp_url"),
    youtubeUrl: text("youtube_url"),
    authorId: text("author_id").notNull(),
    status: text("status", { enum: postStatusEnumValues }).notNull().default("published"),
    submissionStatus: text("submission_status").notNull().default("approved"),
    declineReason: text("decline_reason"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    views: integer("views").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => ({
    artistIdx: index("music_releases_artist_id_idx").on(table.artistId),
    featuredIdx: index("music_releases_featured_idx").on(table.featured),
    genreIdx: index("music_releases_genre_idx").on(table.genre),
    releaseTypeIdx: index("music_releases_release_type_idx").on(table.releaseType),
    slugUnique: uniqueIndex("music_releases_slug_unique").on(table.slug),
    statusIdx: index("music_releases_status_idx").on(table.status),
    submissionStatusIdx: index("music_releases_submission_status_idx").on(table.submissionStatus),
  }),
);

export type MusicRelease = typeof musicReleases.$inferSelect;
export type NewMusicRelease = typeof musicReleases.$inferInsert;

export const artmakerStatusEnumValues = ["draft", "published", "hidden"] as const;

export const artworkStatusEnumValues = ["draft", "published", "archived"] as const;

export const artmakers = sqliteTable(
  "artmakers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clerkUserId: text("clerk_user_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("AR"),
    pronouns: text("pronouns"),
    showPronouns: integer("show_pronouns", { mode: "boolean" }).notNull().default(false),
    phoneNumber: text("phone_number").notNull(),
    medium: text("medium", { mode: "json" }).$type<string[]>().notNull().default([]),
    instagramUsername: text("instagram_username").notNull(),
    instagramUrl: text("instagram_url").notNull(),
    bio: text("bio"),
    image: text("image"),
    claimed: integer("claimed", { mode: "boolean" }).notNull().default(true),
    hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: artmakerStatusEnumValues }).notNull().default("published"),
    profileViews: integer("profile_views").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => ({
    cityStateIdx: index("artmakers_city_state_idx").on(table.city, table.state),
    clerkUserIdUnique: uniqueIndex("artmakers_clerk_user_id_unique").on(table.clerkUserId),
    slugUnique: uniqueIndex("artmakers_slug_unique").on(table.slug),
    statusIdx: index("artmakers_status_idx").on(table.status),
  }),
);

export const artworks = sqliteTable(
  "artworks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    artmakerId: integer("artmaker_id")
      .notNull()
      .references(() => artmakers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    image: text("image").notNull(),
    description: text("description"),
    medium: text("medium"),
    year: text("year"),
    status: text("status", { enum: artworkStatusEnumValues }).notNull().default("published"),
    forSale: integer("for_sale", { mode: "boolean" }).notNull().default(false),
    priceCents: integer("price_cents"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => ({
    artmakerIdx: index("artworks_artmaker_id_idx").on(table.artmakerId),
    slugUnique: uniqueIndex("artworks_slug_unique").on(table.slug),
    statusIdx: index("artworks_status_idx").on(table.status),
  }),
);

// Post-Artist Relations Table (many-to-many)
export const postArtists = sqliteTable(
  "post_artists",
  {
    artistId: integer("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("postArtists_unique").on(table.artistId, table.postId)],
);

export const postArtmakers = sqliteTable(
  "post_artmakers",
  {
    artmakerId: integer("artmaker_id")
      .notNull()
      .references(() => artmakers.id, { onDelete: "cascade" }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("postArtmakers_unique").on(table.artmakerId, table.postId)],
);

// Event-Artist Relations Table (many-to-many)
export const eventArtists = sqliteTable(
  "event_artists",
  {
    artistId: integer("artist_id")
      .notNull()
      .references(() => artists.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("eventArtists_unique").on(table.artistId, table.eventId)],
);

export const eventArtmakers = sqliteTable(
  "event_artmakers",
  {
    artmakerId: integer("artmaker_id")
      .notNull()
      .references(() => artmakers.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("eventArtmakers_unique").on(table.artmakerId, table.eventId)],
);

// Post Import Source Metadata (WordPress backfill traceability)
export const postImportSources = sqliteTable(
  "post_import_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    importedAt: integer("imported_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    sourceAuthorSlug: text("source_author_slug").notNull(),
    sourceCategoriesJson: text("source_categories_json").notNull(),
    sourceModifiedAt: integer("source_modified_at", { mode: "timestamp_ms" }),
    sourcePublishedAt: integer("source_published_at", { mode: "timestamp_ms" }).notNull(),
    sourceUrl: text("source_url").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => ({
    postIdUnique: uniqueIndex("post_import_sources_post_id_unique").on(table.postId),
    sourceAuthorSlugIdx: index("post_import_sources_source_author_slug_idx").on(
      table.sourceAuthorSlug,
    ),
    sourceUrlUnique: uniqueIndex("post_import_sources_source_url_unique").on(table.sourceUrl),
  }),
);

export const backfillRuns = sqliteTable("backfill_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull().unique(),
  // status can be 'running', 'completed', or 'failed'
  status: text("status").notNull(),
  totalPosts: integer("total_posts").notNull().default(0),
  processedPosts: integer("processed_posts").notNull().default(0),
  results: text("results", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});
