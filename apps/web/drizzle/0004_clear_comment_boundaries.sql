CREATE TABLE IF NOT EXISTS "article_comments" (
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

DO $$
BEGIN
  ALTER TABLE "article_comments"
    ADD CONSTRAINT "article_comments_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "article_comments"
    ADD CONSTRAINT "article_comments_parent_id_article_comments_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."article_comments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "article_comments_post_id_idx" ON "article_comments" USING btree ("post_id");
CREATE INDEX IF NOT EXISTS "article_comments_parent_id_idx" ON "article_comments" USING btree ("parent_id");
