CREATE TABLE "post_import_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"source_author_slug" text NOT NULL,
	"source_categories_json" text NOT NULL,
	"source_published_at" timestamp NOT NULL,
	"source_modified_at" timestamp,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_import_sources" ADD CONSTRAINT "post_import_sources_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_import_sources_post_id_unique" ON "post_import_sources" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_import_sources_source_url_unique" ON "post_import_sources" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "post_import_sources_source_author_slug_idx" ON "post_import_sources" USING btree ("source_author_slug");