/*
  # Update activity_logs event_type constraint

  1. Changes
     - Add missing event types that are used in the application code
     - 'upload_analysis_started' is referenced in storage.ts but missing from constraint
     - Ensure all event types used in analytics.ts are covered

  2. Updated Event Types List
     - All existing event types are preserved
     - Added 'upload_analysis_started' for background audio analysis
*/

-- Drop the existing constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_event_type_check;

-- Add the updated constraint with all required event types
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_event_type_check 
CHECK ((event_type = ANY (ARRAY[
  'user_signup'::text, 
  'user_signin'::text, 
  'user_signout'::text, 
  'project_created'::text, 
  'project_updated'::text, 
  'project_deleted'::text, 
  'project_duplicated'::text, 
  'upload_started'::text, 
  'upload_completed'::text, 
  'upload_failed'::text,
  'upload_analysis_started'::text,
  'template_placed'::text, 
  'template_updated'::text, 
  'template_removed'::text, 
  'render_started'::text, 
  'render_completed'::text, 
  'render_failed'::text, 
  'credits_consumed'::text, 
  'credits_refunded'::text, 
  'plan_upgraded'::text, 
  'plan_downgraded'::text
])));