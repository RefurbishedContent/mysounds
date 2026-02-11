/*
  # Create Community Feed Tables

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `title` (text, not null)
      - `description` (text, nullable)
      - `post_type` (text, check: blend/mashup/mix)
      - `source_blend_id` (uuid, nullable)
      - `audio_url` (text, nullable)
      - `cover_image_url` (text, nullable)
      - `duration` (integer, default 0)
      - `bpm` (integer, nullable)
      - `genre_tags` (jsonb, default '[]')
      - `is_published` (boolean, default false)
      - `like_count` (integer, default 0)
      - `play_count` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, FK to posts)
      - `user_id` (uuid, FK to auth.users)
      - `created_at` (timestamptz)
      - unique constraint on (post_id, user_id)

    - `user_follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, FK to auth.users)
      - `following_id` (uuid, FK to auth.users)
      - `created_at` (timestamptz)
      - unique constraint on (follower_id, following_id)

  2. Security
    - Enable RLS on all tables
    - Posts: authenticated users can read published posts, create/update/delete own posts
    - Post likes: authenticated users can read all likes, create/delete own likes
    - User follows: authenticated users can read all follows, create/delete own follows

  3. Indexes
    - posts.created_at for recent feed queries
    - posts.like_count for popular feed queries
    - posts.user_id for user profile queries
    - post_likes(post_id, user_id) for like lookups
    - user_follows(follower_id, following_id) for follow lookups
*/

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  post_type text NOT NULL DEFAULT 'blend' CHECK (post_type IN ('blend', 'mashup', 'mix')),
  source_blend_id uuid,
  audio_url text,
  cover_image_url text,
  duration integer NOT NULL DEFAULT 0,
  bpm integer,
  genre_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  play_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

CREATE POLICY "Users can read published posts"
  ON posts FOR SELECT
  TO authenticated
  USING (is_published = true OR user_id = auth.uid());

CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON post_likes(post_id, user_id);

CREATE POLICY "Users can read likes on published posts"
  ON post_likes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_likes.post_id
      AND (posts.is_published = true OR posts.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

CREATE POLICY "Users can see follows"
  ON user_follows FOR SELECT
  TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());
