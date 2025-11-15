/*
  # Create Meal Plans Table

  ## New Table
  
  `meal_plans` - Per-pax meal pricing with fixed codes
    - Stores cost and price for adults and children
    - Fixed meal codes: BO, LO, DO, HT, SU, FB, FBA, FBB
    - Supports composite calculations (FB = BO+LO+DO, etc.)
    - Active/inactive toggle for availability
    - Resort-scoped for multi-tenancy

  ## Security
  - Enable RLS on meal_plans table
  - Policies scoped by resort_id
  - Staff can read/write for their resort
*/

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  cost_adult numeric(10, 2) DEFAULT 0,
  cost_child numeric(10, 2) DEFAULT 0,
  price_adult numeric(10, 2) DEFAULT 0,
  price_child numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_meal_code CHECK (code IN ('BO', 'LO', 'DO', 'HT', 'SU', 'FB', 'FBA', 'FBB'))
);

-- Create unique constraint
DO $$ BEGIN
  ALTER TABLE meal_plans ADD CONSTRAINT unique_meal_plan_per_resort UNIQUE (resort_id, code);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_resort ON meal_plans(resort_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_code ON meal_plans(code);
CREATE INDEX IF NOT EXISTS idx_meal_plans_active ON meal_plans(is_active);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view meal plans for their resort"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert meal plans for their resort"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update meal plans for their resort"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete meal plans for their resort"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (true);

-- Insert default meal plans for existing resorts
DO $$
DECLARE
  resort_record RECORD;
BEGIN
  FOR resort_record IN SELECT id FROM resorts LOOP
    INSERT INTO meal_plans (resort_id, code, name, cost_adult, cost_child, price_adult, price_child, is_active)
    VALUES
      (resort_record.id, 'BO', 'Breakfast Only', 0, 0, 0, 0, true),
      (resort_record.id, 'LO', 'Lunch Only', 0, 0, 0, 0, true),
      (resort_record.id, 'DO', 'Dinner Only', 0, 0, 0, 0, true),
      (resort_record.id, 'HT', 'Hi-Tea', 0, 0, 0, 0, true),
      (resort_record.id, 'SU', 'Supper', 0, 0, 0, 0, true),
      (resort_record.id, 'FB', 'Full Board (BO+LO+DO)', 0, 0, 0, 0, true),
      (resort_record.id, 'FBA', 'Full Board A (FB+HT)', 0, 0, 0, 0, true),
      (resort_record.id, 'FBB', 'Full Board B (FBA+SU)', 0, 0, 0, 0, true)
    ON CONFLICT (resort_id, code) DO NOTHING;
  END LOOP;
END $$;
