DO $$ BEGIN
  CREATE TYPE "public"."content_vertical" AS ENUM('music', 'arts');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."artmaker_status" AS ENUM('draft', 'published', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."artwork_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'artmaker';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'arts_admin';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'arts_writer';--> statement-breakpoint
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "vertical" "public"."content_vertical" DEFAULT 'music' NOT NULL;
--> statement-breakpoint
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "vertical" "public"."content_vertical" DEFAULT 'music' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artmakers" (
  "id" serial PRIMARY KEY NOT NULL,
  "clerk_user_id" text NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "state" text DEFAULT 'AR' NOT NULL,
  "pronouns" text,
  "show_pronouns" boolean DEFAULT false NOT NULL,
  "phone_number" text NOT NULL,
  "medium" text[] DEFAULT '{}' NOT NULL,
  "instagram_username" text NOT NULL,
  "instagram_url" text NOT NULL,
  "bio" text,
  "image" text,
  "claimed" boolean DEFAULT true NOT NULL,
  "hidden" boolean DEFAULT false NOT NULL,
  "status" "public"."artmaker_status" DEFAULT 'published' NOT NULL,
  "profile_views" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artworks" (
  "id" serial PRIMARY KEY NOT NULL,
  "artmaker_id" integer NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "image" text NOT NULL,
  "description" text,
  "medium" text,
  "year" text,
  "status" "public"."artwork_status" DEFAULT 'published' NOT NULL,
  "for_sale" boolean DEFAULT false NOT NULL,
  "price_cents" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_artmakers" (
  "artmaker_id" integer NOT NULL,
  "post_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_artmakers" (
  "artmaker_id" integer NOT NULL,
  "event_id" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "artworks" ADD CONSTRAINT "artworks_artmaker_id_artmakers_id_fk"
    FOREIGN KEY ("artmaker_id") REFERENCES "public"."artmakers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "post_artmakers" ADD CONSTRAINT "post_artmakers_artmaker_id_artmakers_id_fk"
    FOREIGN KEY ("artmaker_id") REFERENCES "public"."artmakers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "post_artmakers" ADD CONSTRAINT "post_artmakers_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_artmakers" ADD CONSTRAINT "event_artmakers_artmaker_id_artmakers_id_fk"
    FOREIGN KEY ("artmaker_id") REFERENCES "public"."artmakers"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "event_artmakers" ADD CONSTRAINT "event_artmakers_event_id_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artmakers_city_state_idx" ON "artmakers" USING btree ("city", "state");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "artmakers_clerk_user_id_unique" ON "artmakers" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "artmakers_slug_unique" ON "artmakers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artmakers_status_idx" ON "artmakers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artworks_artmaker_id_idx" ON "artworks" USING btree ("artmaker_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "artworks_slug_unique" ON "artworks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artworks_status_idx" ON "artworks" USING btree ("status");
