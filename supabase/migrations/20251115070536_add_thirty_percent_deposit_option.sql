/*
  # Add 30% Deposit Option

  1. Enums
    - Add thirty_percent to deposit_policy_type enum

  2. Notes
    - The custom option already exists for manual adjustment amounts
*/

-- Add thirty_percent deposit option
DO $$ BEGIN
  ALTER TYPE deposit_policy_type ADD VALUE IF NOT EXISTS 'thirty_percent';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;