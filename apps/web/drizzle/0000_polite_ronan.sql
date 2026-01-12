CREATE TYPE "public"."category" AS ENUM('COUNTRY', 'EDM', 'HARDCORE & ROCK', 'HIP-HOP & R&B', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'past');--> statement-breakpoint
CREATE TYPE "public"."genre" AS ENUM('COUNTRY', 'EDM', 'HARDCORE & ROCK', 'HIP-HOP & R&B', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"image" text,
	"location" text NOT NULL,
	"genre" "genre" NOT NULL,
	"spotify_url" text,
	"spotify_artist_id" text,
	"instagram" text,
	"twitter" text,
	"tiktok" text,
	"website" text,
	"email" text,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimed_by_id" text,
	"profile_views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_artists" (
	"event_id" integer NOT NULL,
	"artist_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"image" text,
	"venue" text NOT NULL,
	"location" text NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"ticket_link" text,
	"price" text,
	"genre" "genre" NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "post_artists" (
	"post_id" integer NOT NULL,
	"artist_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" "category" NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"cover_image" text,
	"author_id" text NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"is_cover_story" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_artists" ADD CONSTRAINT "event_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_artists" ADD CONSTRAINT "post_artists_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_artists" ADD CONSTRAINT "post_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;