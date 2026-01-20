/*
  # Create templates table

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `thumbnail_url` (text)
      - `duration` (integer, in seconds)
      - `difficulty` (text)
      - `is_popular` (boolean, default false)
      - `is_premium` (boolean, default false)
      - `author` (text)
      - `downloads` (integer, default 0)
      - `rating` (numeric, default 0)
      - `template_data` (jsonb, for storing template configuration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `templates` table
    - Add policy for all authenticated users to read templates
    - Add policy for admin users to manage templates
*/

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('electronic', 'hip-hop', 'house', 'techno', 'trance', 'dubstep', 'ambient', 'other')),
  thumbnail_url text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_popular boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  author text NOT NULL,
  downloads integer DEFAULT 0 CHECK (downloads >= 0),
  rating numeric(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  template_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "Authenticated users can read templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin users can insert/update/delete templates (for now, we'll use a simple check)
-- In a real app, you'd have an admin role system
CREATE POLICY "Admin users can manage templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'admin'
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_difficulty ON templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_templates_popular ON templates(is_popular);
CREATE INDEX IF NOT EXISTS idx_templates_premium ON templates(is_premium);