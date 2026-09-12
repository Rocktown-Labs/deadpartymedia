CREATE TABLE IF NOT EXISTS "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"city" text DEFAULT 'Little Rock' NOT NULL,
	"state" text DEFAULT 'AR' NOT NULL,
	"zip" text,
	"website" text,
	"phone" text,
	"capacity" text,
	"description" text,
	"booking_rates" text,
	"booking_email" text,
	"image" text,
	"claimed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "music_releases" ADD COLUMN IF NOT EXISTS "audio_url" text;--> statement-breakpoint
ALTER TABLE "music_releases" ADD COLUMN IF NOT EXISTS "submission_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "music_releases" ADD COLUMN IF NOT EXISTS "decline_reason" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_releases_submission_status_idx" ON "music_releases" USING btree ("submission_status");--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "booking_rates" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "booking_email" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "image" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "genres" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_id" integer;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
