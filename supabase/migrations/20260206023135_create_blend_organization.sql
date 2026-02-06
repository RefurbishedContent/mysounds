/*
  # Create Blend Organization System

  1. New Tables
    - `blend_folders`
      - `id` (uuid, primary key) - Unique identifier for the folder
      - `user_id` (uuid, foreign key) - User who owns the folder
      - `name` (text) - Name of the folder
      - `parent_id` (uuid, nullable) - Parent folder for nested structure
      - `color` (text) - Color code for visual organization
      - `icon` (text) - Icon name for folder display
      - `position` (integer) - Sort order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blend_bins`
      - `id` (uuid, primary key) - Unique identifier for the bin
      - `folder_id` (uuid, foreign key) - Parent folder
      - `user_id` (uuid, foreign key) - User who owns the bin
      - `name` (text) - Name of the bin
      - `description` (text) - Optional description
      - `color` (text) - Color code for visual organization
      - `position` (integer) - Sort order within folder
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blend_tags`
      - `id` (uuid, primary key) - Unique identifier for the tag
      - `user_id` (uuid, foreign key) - User who owns the tag
      - `name` (text) - Tag name
      - `color` (text) - Color code for tag display
      - `created_at` (timestamptz)

    - `blend_tag_assignments`
      - Junction table linking blends to tags
      - `blend_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Updates to Existing Tables
    - Add `folder_id` and `bin_id` to `blends` table
    - Add `is_favorite` flag to `blends` table

  3. Security
    - Enable RLS on all new tables
    - Users can only access their own folders, bins, and tags
    - Comprehensive policies for all CRUD operations

  4. Important Notes
    - Folders can be nested with `parent_id` for hierarchical organization
    - Bins are contained within folders for sub-categorization
    - Tags provide flexible cross-folder organization
    - Position fields enable custom sorting
    - Color and icon support visual organization
*/

-- Create blend_folders table
CREATE TABLE IF NOT EXISTS blend_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES blend_folders(id) ON DELETE CASCADE,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT folder_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create blend_bins table
CREATE TABLE IF NOT EXISTS blend_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES blend_folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#06b6d4',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bin_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create blend_tags table
CREATE TABLE IF NOT EXISTS blend_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#8b5cf6',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tag_name_not_empty CHECK (length(trim(name)) > 0),
  UNIQUE(user_id, name)
);

-- Create blend_tag_assignments junction table
CREATE TABLE IF NOT EXISTS blend_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blend_id uuid REFERENCES blends(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES blend_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blend_id, tag_id)
);

-- Add organization columns to blends table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blends' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE blends ADD COLUMN folder_id uuid REFERENCES blend_folders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blends' AND column_name = 'bin_id'
  ) THEN
    ALTER TABLE blends ADD COLUMN bin_id uuid REFERENCES blend_bins(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blends' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE blends ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blends' AND column_name = 'position'
  ) THEN
    ALTER TABLE blends ADD COLUMN position integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blend_folders_user_id ON blend_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_blend_folders_parent_id ON blend_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_blend_bins_folder_id ON blend_bins(folder_id);
CREATE INDEX IF NOT EXISTS idx_blend_bins_user_id ON blend_bins(user_id);
CREATE INDEX IF NOT EXISTS idx_blend_tags_user_id ON blend_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_blend_tag_assignments_blend_id ON blend_tag_assignments(blend_id);
CREATE INDEX IF NOT EXISTS idx_blend_tag_assignments_tag_id ON blend_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_blends_folder_id ON blends(folder_id);
CREATE INDEX IF NOT EXISTS idx_blends_bin_id ON blends(bin_id);
CREATE INDEX IF NOT EXISTS idx_blends_is_favorite ON blends(user_id, is_favorite) WHERE is_favorite = true;

-- Enable Row Level Security
ALTER TABLE blend_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE blend_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE blend_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blend_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blend_folders
CREATE POLICY "Users can view own folders"
  ON blend_folders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON blend_folders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON blend_folders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON blend_folders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for blend_bins
CREATE POLICY "Users can view own bins"
  ON blend_bins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bins"
  ON blend_bins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bins"
  ON blend_bins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bins"
  ON blend_bins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for blend_tags
CREATE POLICY "Users can view own tags"
  ON blend_tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
  ON blend_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON blend_tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON blend_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for blend_tag_assignments
CREATE POLICY "Users can view tag assignments for their blends"
  ON blend_tag_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tag assignments for their blends"
  ON blend_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tag assignments for their blends"
  ON blend_tag_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = auth.uid()
    )
  );