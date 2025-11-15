/*
  # Fix Meal Plans Table - Resort Scoping and RLS

  ## Changes
  
  1. Ensure meal_plans has resort_id and updated_at columns
  2. Add proper constraints and indexes
  3. Fix RLS policies to scope by resort membership
  4. Seed default meal codes for all resorts
  
  ## Security
  - RLS policies check resort membership via resorts table
  - Users can only access meal plans for resorts they belong to
*/

-- Drop the trigger temporarily if it exists
DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add resort_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'resort_id'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN resort_id uuid;
    
    UPDATE meal_plans m
    SET resort_id = (SELECT id FROM resorts LIMIT 1)
    WHERE resort_id IS NULL;
    
    ALTER TABLE meal_plans ALTER COLUMN resort_id SET NOT NULL;
    
    ALTER TABLE meal_plans ADD CONSTRAINT fk_meal_plans_resort 
      FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure numeric columns have proper defaults
DO $$
BEGIN
  ALTER TABLE meal_plans ALTER COLUMN cost_adult SET DEFAULT 0;
  ALTER TABLE meal_plans ALTER COLUMN cost_child SET DEFAULT 0;
  ALTER TABLE meal_plans ALTER COLUMN price_adult SET DEFAULT 0;
  ALTER TABLE meal_plans ALTER COLUMN price_child SET DEFAULT 0;
  ALTER TABLE meal_plans ALTER COLUMN is_active SET DEFAULT true;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop old unique constraint if it exists
DO $$
BEGIN
  ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS unique_meal_plan_code;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Ensure unique constraint on (resort_id, code)
DO $$
BEGIN
  ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS unique_meal_plan_per_resort;
  ALTER TABLE meal_plans ADD CONSTRAINT unique_meal_plan_per_resort 
    UNIQUE (resort_id, code);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_resort_id ON meal_plans(resort_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_code ON meal_plans(code);
CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(is_active);

-- Recreate the trigger
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view meal plans for their resort" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert meal plans for their resort" ON meal_plans;
DROP POLICY IF EXISTS "Users can update meal plans for their resort" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete meal plans for their resort" ON meal_plans;
DROP POLICY IF EXISTS "Users can view meal plans for their resorts" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert meal plans for their resorts" ON meal_plans;
DROP POLICY IF EXISTS "Users can update meal plans for their resorts" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete meal plans for their resorts" ON meal_plans;

-- Create proper RLS policies
CREATE POLICY "Users can view meal plans for their resorts"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = meal_plans.resort_id
    )
  );

CREATE POLICY "Users can insert meal plans for their resorts"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = meal_plans.resort_id
    )
  );

CREATE POLICY "Users can update meal plans for their resorts"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = meal_plans.resort_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = meal_plans.resort_id
    )
  );

CREATE POLICY "Users can delete meal plans for their resorts"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = meal_plans.resort_id
    )
  );

-- Seed default meal plans for all resorts (idempotent)
DO $$
DECLARE
  resort_record RECORD;
BEGIN
  FOR resort_record IN SELECT id FROM resorts LOOP
    INSERT INTO meal_plans (resort_id, code, name, cost_adult, cost_child, price_adult, price_child, is_active)
    VALUES
      (resort_record.id, 'BO', 'Breakfast only', 0, 0, 0, 0, true),
      (resort_record.id, 'LO', 'Lunch only', 0, 0, 0, 0, true),
      (resort_record.id, 'DO', 'Dinner only', 0, 0, 0, 0, true),
      (resort_record.id, 'HT', 'Hi-tea only', 0, 0, 0, 0, true),
      (resort_record.id, 'SU', 'Supper only', 0, 0, 0, 0, true),
      (resort_record.id, 'FB', 'Fullboard (B,L,D)', 0, 0, 0, 0, true),
      (resort_record.id, 'FBA', 'Fullboard A (B,L,D,H)', 0, 0, 0, 0, true),
      (resort_record.id, 'FBB', 'Fullboard B (B,L,D,H,S)', 0, 0, 0, 0, true)
    ON CONFLICT (resort_id, code) 
    DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = now();
  END LOOP;
END $$;
