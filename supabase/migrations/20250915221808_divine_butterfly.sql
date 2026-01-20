/*
  # Add admin permissions and template authoring

  1. Updates
    - Add admin role to users table
    - Update RLS policies for template management
    - Add template authoring permissions

  2. Security
    - Admin users can create/edit templates
    - Regular users can only read templates
*/

-- Update users table to include admin role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'users_plan_check' 
    AND check_clause LIKE '%admin%'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
    ALTER TABLE users ADD CONSTRAINT users_plan_check 
      CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'premium'::text, 'admin'::text]));
  END IF;
END $$;

-- Update template policies for admin access
DROP POLICY IF EXISTS "Admin users can manage templates" ON templates;
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'admin'
    )
  );

-- Ensure regular users can still read templates
DROP POLICY IF EXISTS "Authenticated users can read templates" ON templates;
CREATE POLICY "Authenticated users can read templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (true);