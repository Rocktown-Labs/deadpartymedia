-- Fix missing category column in posts table
-- This script adds the category column if it doesn't exist

DO $$
BEGIN
    -- Check if the column exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE posts ADD COLUMN category "category" NOT NULL DEFAULT 'OTHER';
    END IF;
END $$;
