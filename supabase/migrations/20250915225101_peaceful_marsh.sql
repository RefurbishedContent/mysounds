/*
  # Activity Logs and Analytics System

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `event_type` (text, categorized event types)
      - `event_data` (jsonb, structured event data)
      - `ip_address` (text, user IP for security)
      - `user_agent` (text, browser/device info)
      - `session_id` (text, session tracking)
      - `created_at` (timestamp)
    - `analytics_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for anonymous events)
      - `event_name` (text, analytics event name)
      - `properties` (jsonb, event properties)
      - `session_id` (text, session tracking)
      - `page_url` (text, current page)
      - `referrer` (text, referrer URL)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Admin-only access for activity logs
    - User access to own analytics events

  3. Indexes
    - Performance indexes for common queries
    - Time-based indexes for log retention
*/

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}',
  session_id text,
  page_url text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Activity Logs Policies (Admin only)
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'admin'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Analytics Events Policies
CREATE POLICY "Users can view own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'admin'
    )
  );

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonymous analytics events allowed"
  ON analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- Event Type Constraints
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_event_type_check 
  CHECK (event_type IN (
    'user_signup',
    'user_signin',
    'user_signout',
    'project_created',
    'project_updated',
    'project_deleted',
    'project_duplicated',
    'upload_started',
    'upload_completed',
    'upload_failed',
    'template_placed',
    'template_updated',
    'template_removed',
    'render_started',
    'render_completed',
    'render_failed',
    'credits_consumed',
    'credits_refunded',
    'plan_upgraded',
    'plan_downgraded'
  ));

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO activity_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_data,
    p_ip_address,
    p_user_agent,
    p_session_id
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track analytics event
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_user_id uuid,
  p_event_name text,
  p_properties jsonb DEFAULT '{}',
  p_session_id text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_referrer text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO analytics_events (
    user_id,
    event_name,
    properties,
    session_id,
    page_url,
    referrer
  ) VALUES (
    p_user_id,
    p_event_name,
    p_properties,
    p_session_id,
    p_page_url,
    p_referrer
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;