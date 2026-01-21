/*
  # Update Transition Duration Constraints

  1. Changes
    - Update `transitions` table `transition_duration` column constraint
    - Change minimum from 1 to 4 seconds
    - Change maximum from 60 to 25 seconds
    
  2. Reasoning
    - Simplify transition creation with predefined duration ranges
    - Short: 4-8 seconds
    - Medium: 8-15 seconds
    - Long: 16-25 seconds
    - Makes the system more predictable and easier to use
*/

-- Drop the old constraint
ALTER TABLE transitions
DROP CONSTRAINT IF EXISTS transitions_transition_duration_check;

-- Add the new constraint
ALTER TABLE transitions
ADD CONSTRAINT transitions_transition_duration_check
CHECK (transition_duration >= 4 AND transition_duration <= 25);
