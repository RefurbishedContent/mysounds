/*
  # Create transitions table for storing song transitions
  
  1. New Tables
    - `transitions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text) - user-defined name for the transition
      - `song_a_id` (uuid, foreign key to uploads) - the ending song
      - `song_b_id` (uuid, foreign key to uploads) - the beginning song
      - `template_id` (uuid, foreign key to templates) - the transition template used
      - `transition_start_point` (integer, in seconds) - where in song A the transition begins
      - `transition_duration` (integer, in seconds) - duration of the blend
      - `song_a_end_time` (integer, in seconds) - how much of song A's ending to play
      - `song_b_start_time` (integer, in seconds) - where in song B to start (default 0)
      - `status` (text) - draft, ready, processing, error
      - `render_job_id` (uuid, optional foreign key to render_jobs)
      - `output_url` (text, optional) - URL to rendered audio if generated
      - `metadata` (jsonb) - additional transition metadata
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `transitions` table
    - Add policies for users to manage their own transitions
  
  3. Important Notes
    - Transitions represent blends between song endings and beginnings, not full mixes
    - The projects table can be repurposed or left for other uses
    - Users can save and reuse transitions in playlists
*/

CREATE TABLE IF NOT EXISTS transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Transition',
  song_a_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  song_b_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  transition_start_point integer NOT NULL DEFAULT 30 CHECK (transition_start_point >= 0),
  transition_duration integer NOT NULL DEFAULT 16 CHECK (transition_duration > 0 AND transition_duration <= 60),
  song_a_end_time integer NOT NULL DEFAULT 30 CHECK (song_a_end_time >= 0),
  song_b_start_time integer NOT NULL DEFAULT 0 CHECK (song_b_start_time >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'processing', 'error')),
  render_job_id uuid REFERENCES render_jobs(id) ON DELETE SET NULL,
  output_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transitions"
  ON transitions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own transitions"
  ON transitions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own transitions"
  ON transitions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own transitions"
  ON transitions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE TRIGGER update_transitions_updated_at
  BEFORE UPDATE ON transitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_transitions_user_id ON transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_transitions_song_a_id ON transitions(song_a_id);
CREATE INDEX IF NOT EXISTS idx_transitions_song_b_id ON transitions(song_b_id);
CREATE INDEX IF NOT EXISTS idx_transitions_template_id ON transitions(template_id);
CREATE INDEX IF NOT EXISTS idx_transitions_status ON transitions(status);
CREATE INDEX IF NOT EXISTS idx_transitions_created_at ON transitions(created_at DESC);