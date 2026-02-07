CREATE INDEX IF NOT EXISTS article_comments_clerk_user_id_idx
  ON article_comments (clerk_user_id);

CREATE INDEX IF NOT EXISTS article_comments_user_created_at_idx
  ON article_comments (clerk_user_id, created_at);
