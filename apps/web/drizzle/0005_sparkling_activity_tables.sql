CREATE TABLE IF NOT EXISTS "user_article_reads" (
  "id" serial PRIMARY KEY NOT NULL,
  "clerk_user_id" text NOT NULL,
  "post_id" integer NOT NULL,
  "read_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_article_saves" (
  "id" serial PRIMARY KEY NOT NULL,
  "clerk_user_id" text NOT NULL,
  "post_id" integer NOT NULL,
  "saved_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "user_article_reads"
    ADD CONSTRAINT "user_article_reads_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_article_saves"
    ADD CONSTRAINT "user_article_saves_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "user_article_reads_user_post_unique"
  ON "user_article_reads" USING btree ("clerk_user_id", "post_id");

CREATE UNIQUE INDEX IF NOT EXISTS "user_article_saves_user_post_unique"
  ON "user_article_saves" USING btree ("clerk_user_id", "post_id");

CREATE INDEX IF NOT EXISTS "user_article_reads_user_idx"
  ON "user_article_reads" USING btree ("clerk_user_id");

CREATE INDEX IF NOT EXISTS "user_article_saves_user_idx"
  ON "user_article_saves" USING btree ("clerk_user_id");
