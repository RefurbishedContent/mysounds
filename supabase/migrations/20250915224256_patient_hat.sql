/*
  # Credits and Billing System

  1. New Tables
    - `user_credits`
      - `user_id` (uuid, foreign key to users)
      - `credits_remaining` (integer, current credit balance)
      - `credits_used_this_month` (integer, monthly usage tracking)
      - `last_reset_date` (timestamp, for monthly reset tracking)
      - `total_credits_purchased` (integer, lifetime purchases)
      - `total_credits_earned` (integer, free credits earned)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `type` (enum: earned, purchased, consumed, refunded)
      - `amount` (integer, credit amount - positive for gains, negative for consumption)
      - `description` (text, transaction description)
      - `render_job_id` (uuid, optional link to render job)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to read/update own credit data
    - Add admin policies for credit management

  3. Functions
    - `reset_monthly_credits()` - Function to reset monthly allocations
    - `consume_credits()` - Function to safely consume credits with validation
*/

-- Create credit transaction type enum
CREATE TYPE credit_transaction_type AS ENUM ('earned', 'purchased', 'consumed', 'refunded');

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credits_remaining integer DEFAULT 0 NOT NULL,
  credits_used_this_month integer DEFAULT 0 NOT NULL,
  last_reset_date timestamptz DEFAULT now() NOT NULL,
  total_credits_purchased integer DEFAULT 0 NOT NULL,
  total_credits_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type credit_transaction_type NOT NULL,
  amount integer NOT NULL,
  description text NOT NULL,
  render_job_id uuid REFERENCES render_jobs(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can read own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits"
  ON user_credits
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.plan = 'admin'
  ));

-- RLS Policies for credit_transactions
CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON credit_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.plan = 'admin'
  ));

-- Function to initialize user credits
CREATE OR REPLACE FUNCTION initialize_user_credits(user_id_param uuid, plan_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  initial_credits integer;
BEGIN
  -- Determine initial credits based on plan
  CASE plan_param
    WHEN 'free' THEN initial_credits := 3;
    WHEN 'pro' THEN initial_credits := 50;
    WHEN 'premium' THEN initial_credits := 200;
    WHEN 'admin' THEN initial_credits := 9999;
    ELSE initial_credits := 3;
  END CASE;

  -- Insert or update user credits
  INSERT INTO user_credits (
    user_id, 
    credits_remaining, 
    total_credits_earned
  ) VALUES (
    user_id_param, 
    initial_credits, 
    initial_credits
  )
  ON CONFLICT (user_id) DO UPDATE SET
    credits_remaining = GREATEST(user_credits.credits_remaining, initial_credits),
    total_credits_earned = user_credits.total_credits_earned + 
      GREATEST(0, initial_credits - user_credits.credits_remaining),
    updated_at = now();

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description
  ) VALUES (
    user_id_param,
    'earned',
    initial_credits,
    'Initial credits for ' || plan_param || ' plan'
  );
END;
$$;

-- Function to consume credits for render job
CREATE OR REPLACE FUNCTION consume_credits_for_render(
  user_id_param uuid,
  render_job_id_param uuid,
  credits_needed integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits integer;
  user_plan text;
BEGIN
  -- Get current credits and plan
  SELECT 
    uc.credits_remaining,
    u.plan
  INTO current_credits, user_plan
  FROM user_credits uc
  JOIN users u ON u.id = uc.user_id
  WHERE uc.user_id = user_id_param;

  -- Check if user has enough credits
  IF current_credits < credits_needed THEN
    RETURN false;
  END IF;

  -- Consume credits
  UPDATE user_credits 
  SET 
    credits_remaining = credits_remaining - credits_needed,
    credits_used_this_month = credits_used_this_month + credits_needed,
    updated_at = now()
  WHERE user_id = user_id_param;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    render_job_id,
    metadata
  ) VALUES (
    user_id_param,
    'consumed',
    -credits_needed,
    'Export render job',
    render_job_id_param,
    jsonb_build_object('plan', user_plan, 'job_id', render_job_id_param)
  );

  RETURN true;
END;
$$;

-- Function to refund credits for failed render
CREATE OR REPLACE FUNCTION refund_credits_for_failed_render(
  user_id_param uuid,
  render_job_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  credits_to_refund integer;
BEGIN
  -- Find the consumption transaction
  SELECT ABS(amount) INTO credits_to_refund
  FROM credit_transactions
  WHERE user_id = user_id_param 
    AND render_job_id = render_job_id_param 
    AND type = 'consumed'
  LIMIT 1;

  IF credits_to_refund IS NOT NULL THEN
    -- Refund credits
    UPDATE user_credits 
    SET 
      credits_remaining = credits_remaining + credits_to_refund,
      credits_used_this_month = GREATEST(0, credits_used_this_month - credits_to_refund),
      updated_at = now()
    WHERE user_id = user_id_param;

    -- Record refund transaction
    INSERT INTO credit_transactions (
      user_id,
      type,
      amount,
      description,
      render_job_id
    ) VALUES (
      user_id_param,
      'refunded',
      credits_to_refund,
      'Refund for failed render job',
      render_job_id_param
    );
  END IF;
END;
$$;

-- Function to reset monthly credits (to be called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  monthly_credits integer;
BEGIN
  -- Reset credits for users whose reset date has passed
  FOR user_record IN 
    SELECT uc.user_id, u.plan, uc.last_reset_date
    FROM user_credits uc
    JOIN users u ON u.id = uc.user_id
    WHERE uc.last_reset_date < date_trunc('month', now())
  LOOP
    -- Determine monthly allocation
    CASE user_record.plan
      WHEN 'pro' THEN monthly_credits := 50;
      WHEN 'premium' THEN monthly_credits := 200;
      WHEN 'admin' THEN monthly_credits := 9999;
      ELSE monthly_credits := 3; -- free plan
    END CASE;

    -- Reset credits
    UPDATE user_credits 
    SET 
      credits_remaining = monthly_credits,
      credits_used_this_month = 0,
      last_reset_date = date_trunc('month', now()),
      updated_at = now()
    WHERE user_id = user_record.user_id;

    -- Record transaction
    INSERT INTO credit_transactions (
      user_id,
      type,
      amount,
      description
    ) VALUES (
      user_record.user_id,
      'earned',
      monthly_credits,
      'Monthly credit allocation for ' || user_record.plan || ' plan'
    );
  END LOOP;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_render_job_id ON credit_transactions(render_job_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize credits for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, plan FROM users LOOP
    PERFORM initialize_user_credits(user_record.id, user_record.plan);
  END LOOP;
END $$;