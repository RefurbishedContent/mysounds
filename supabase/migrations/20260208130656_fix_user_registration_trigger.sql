/*
  # Fix User Registration -- Auto-create profile + credits on signup

  1. Changes
    - Drop the broken `on_auth_user_created` trigger and its function
      `initialize_user_credits` (trigger version) which referenced
      non-existent columns (`credits`, `free_credits`)
    - Create a new `handle_new_user()` SECURITY DEFINER function that:
      a) Inserts a row into `public.users` (profile)
      b) Inserts a row into `public.user_credits` with 100 starting credits
      c) Records the 100-credit grant in `credit_transactions`
    - Attach the function as an AFTER INSERT trigger on `auth.users`

  2. Backfill
    - Insert `public.users` rows for 3 orphaned auth users
    - Insert `user_credits` rows with 100 credits for each
    - Record credit transactions for the backfill grants

  3. Security
    - Function runs as SECURITY DEFINER with restricted search_path
    - All inserts use ON CONFLICT DO NOTHING for idempotency
*/

-- Step 1: Drop the broken trigger and its function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.initialize_user_credits() CASCADE;

-- Step 2: Create the new handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _name text;
BEGIN
  _name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, _name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, credits_remaining, total_credits_earned)
  VALUES (NEW.id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (id, user_id, type, amount, description)
  VALUES (gen_random_uuid(), NEW.id, 'earned', 100, 'Welcome bonus credits')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Backfill orphaned auth users who have no public.users row
INSERT INTO public.users (id, email, name)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Backfill user_credits for anyone missing them
INSERT INTO public.user_credits (user_id, credits_remaining, total_credits_earned)
SELECT au.id, 100, 100
FROM auth.users au
LEFT JOIN public.user_credits uc ON au.id = uc.user_id
WHERE uc.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Record backfill credit transactions
INSERT INTO public.credit_transactions (id, user_id, type, amount, description)
SELECT gen_random_uuid(), au.id, 'earned', 100, 'Welcome bonus credits (backfill)'
FROM auth.users au
LEFT JOIN public.credit_transactions ct
  ON au.id = ct.user_id AND ct.description LIKE 'Welcome bonus%'
WHERE ct.id IS NULL;
