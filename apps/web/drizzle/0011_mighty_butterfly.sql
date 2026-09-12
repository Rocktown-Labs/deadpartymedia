CREATE TABLE IF NOT EXISTS "music_releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"artist_name" text NOT NULL,
	"artist_id" integer,
	"release_type" text DEFAULT 'Single' NOT NULL,
	"genre" "genre" DEFAULT 'OTHER' NOT NULL,
	"release_date" text,
	"cover_art" text,
	"excerpt" text NOT NULL,
	"content" text,
	"spotify_url" text,
	"apple_music_url" text,
	"bandcamp_url" text,
	"youtube_url" text,
	"author_id" text NOT NULL,
	"status" "post_status" DEFAULT 'published' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "music_releases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "music_releases" ADD CONSTRAINT "music_releases_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_artist_id_idx" ON "music_releases" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_featured_idx" ON "music_releases" USING btree ("featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_genre_idx" ON "music_releases" USING btree ("genre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_release_type_idx" ON "music_releases" USING btree ("release_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "music_releases_slug_unique" ON "music_releases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_status_idx" ON "music_releases" USING btree ("status");