CREATE TYPE "public"."role" AS ENUM('artist', 'fan', 'super_admin', 'writer');--> statement-breakpoint
CREATE TABLE "article_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"clerk_user_id" text NOT NULL,
	"user_name" text,
	"user_email" text,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_article_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_article_saves" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'fan' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_parent_id_article_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."article_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_article_reads" ADD CONSTRAINT "user_article_reads_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_article_saves" ADD CONSTRAINT "user_article_saves_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_comments_post_id_idx" ON "article_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "article_comments_parent_id_idx" ON "article_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "article_comments_clerk_user_id_idx" ON "article_comments" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "article_comments_user_created_at_idx" ON "article_comments" USING btree ("clerk_user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_article_reads_user_idx" ON "user_article_reads" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_article_reads_user_post_unique" ON "user_article_reads" USING btree ("clerk_user_id","post_id");--> statement-breakpoint
CREATE INDEX "user_article_saves_user_idx" ON "user_article_saves" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_article_saves_user_post_unique" ON "user_article_saves" USING btree ("clerk_user_id","post_id");