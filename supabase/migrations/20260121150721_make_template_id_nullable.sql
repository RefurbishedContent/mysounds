/*
  # Make template_id nullable in transitions table

  1. Changes
    - Alter `template_id` column to allow NULL values
    - This allows users to create custom transitions without using a template

  2. Purpose
    - Enable custom transitions created from scratch
    - Template-based transitions can still reference templates
    - Supports flexible workflow where users can either start from a template or from scratch

  3. Important Notes
    - Existing transitions with template references remain unchanged
    - New transitions can be created with or without templates
*/

-- Make template_id nullable
ALTER TABLE transitions
  ALTER COLUMN template_id DROP NOT NULL;
