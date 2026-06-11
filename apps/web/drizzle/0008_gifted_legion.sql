CREATE TABLE "backfill_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"status" text NOT NULL,
	"total_posts" integer DEFAULT 0 NOT NULL,
	"processed_posts" integer DEFAULT 0 NOT NULL,
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "backfill_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tags" text[];