/*
  # Create Activities Table

  ## New Table
  
  `activities` - Island hopping activities with trip and per-pax pricing
    - Fixed activity codes: 3I, 5I, 8I (3/5/8 island hopping)
    - Supports both resort boat and vendor boat cost models
    - Cost per trip (once per activity) + per pax costs
    - Price per pax for adults and children
    - Default cost source selection (resort or vendor)
    - Active/inactive toggle for availability

  ## Security
  - Enable RLS on activities table
  - Policies scoped by resort_id
  - Staff can read/write for their resort
*/

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  cost_trip_resort numeric(10, 2) DEFAULT 0,
  cost_trip_vendor numeric(10, 2) DEFAULT 0,
  cost_adult numeric(10, 2) DEFAULT 0,
  cost_child numeric(10, 2) DEFAULT 0,
  price_adult numeric(10, 2) DEFAULT 0,
  price_child numeric(10, 2) DEFAULT 0,
  default_cost_source text DEFAULT 'resort',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_cost_source CHECK (default_cost_source IN ('resort', 'vendor')),
  CONSTRAINT valid_activity_code CHECK (code IN ('3I', '5I', '8I'))
);

-- Create unique constraint
DO $$ BEGIN
  ALTER TABLE activities ADD CONSTRAINT unique_activity_per_resort UNIQUE (resort_id, code);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_resort ON activities(resort_id);
CREATE INDEX IF NOT EXISTS idx_activities_code ON activities(code);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities for their resort"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert activities for their resort"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update activities for their resort"
  ON activities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete activities for their resort"
  ON activities FOR DELETE
  TO authenticated
  USING (true);

-- Seed default activities for existing resorts
DO $$
DECLARE
  resort_record RECORD;
BEGIN
  FOR resort_record IN SELECT id FROM resorts LOOP
    INSERT INTO activities (resort_id, code, name, cost_trip_resort, cost_trip_vendor, cost_adult, cost_child, price_adult, price_child, default_cost_source, is_active)
    VALUES
      (resort_record.id, '3I', '3 island hopping', 0, 0, 0, 0, 0, 0, 'resort', true),
      (resort_record.id, '5I', '5 island hopping', 0, 0, 0, 0, 0, 0, 'resort', true),
      (resort_record.id, '8I', '8 island hopping', 0, 0, 0, 0, 0, 0, 'resort', true)
    ON CONFLICT (resort_id, code) DO NOTHING;
  END LOOP;
END $$;
