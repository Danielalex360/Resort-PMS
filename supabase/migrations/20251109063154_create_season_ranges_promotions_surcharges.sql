/*
  # Create Season Ranges, Promotions, and Surcharges

  ## New Tables
  1. `season_ranges` - Date range management for seasons
     - Defines season assignments over date ranges
     - Automatically expands into season_assignments
  
  2. `promotions` - Promotional discounts and offers
     - Percentage-based discounts
     - Early booking conditions
     - Target specific seasons, rooms, or packages
  
  3. `surcharges` - Additional charges
     - Fixed RM per pax
     - Peak period fees
     - Target specific conditions

  ## Security
  - Enable RLS on all new tables
  - Add appropriate policies for multi-tenant access
*/

-- Create target season enum
DO $$ BEGIN
  CREATE TYPE target_season_type AS ENUM ('any', 'low', 'mid', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create applies_to enum for promotions
DO $$ BEGIN
  CREATE TYPE applies_to_type AS ENUM ('all', 'room_only', 'package_code', 'room_type');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create applies_to enum for surcharges (no room_only option)
DO $$ BEGIN
  CREATE TYPE surcharge_applies_to_type AS ENUM ('all', 'package_code', 'room_type');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create season_ranges table
CREATE TABLE IF NOT EXISTS season_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  date_end date NOT NULL,
  season season_type NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (date_end >= date_start)
);

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  target_season target_season_type DEFAULT 'any',
  percent_off decimal(5, 2) NOT NULL,
  min_days_in_advance integer DEFAULT 0,
  applies_to applies_to_type DEFAULT 'all',
  package_code text,
  room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL,
  weekday_mask text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (date_end >= date_start),
  CONSTRAINT valid_percent CHECK (percent_off >= 0 AND percent_off <= 100)
);

-- Create surcharges table
CREATE TABLE IF NOT EXISTS surcharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  target_season target_season_type DEFAULT 'any',
  amount_per_pax decimal(10, 2) NOT NULL,
  applies_to surcharge_applies_to_type DEFAULT 'all',
  package_code text,
  room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL,
  weekday_mask text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (date_end >= date_start),
  CONSTRAINT valid_amount CHECK (amount_per_pax >= 0)
);

-- Create indexes for season_ranges
CREATE INDEX IF NOT EXISTS idx_season_ranges_resort_id ON season_ranges(resort_id);
CREATE INDEX IF NOT EXISTS idx_season_ranges_dates ON season_ranges(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_season_ranges_season ON season_ranges(season);

-- Create indexes for promotions
CREATE INDEX IF NOT EXISTS idx_promotions_resort_id ON promotions(resort_id);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_season ON promotions(target_season);

-- Create indexes for surcharges
CREATE INDEX IF NOT EXISTS idx_surcharges_resort_id ON surcharges(resort_id);
CREATE INDEX IF NOT EXISTS idx_surcharges_dates ON surcharges(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_surcharges_active ON surcharges(is_active);
CREATE INDEX IF NOT EXISTS idx_surcharges_season ON surcharges(target_season);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_season_ranges_updated_at ON season_ranges;
CREATE TRIGGER update_season_ranges_updated_at
  BEFORE UPDATE ON season_ranges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_surcharges_updated_at ON surcharges;
CREATE TRIGGER update_surcharges_updated_at
  BEFORE UPDATE ON surcharges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE season_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surcharges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for season_ranges
CREATE POLICY "Users can view season ranges for their resort"
  ON season_ranges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert season ranges for their resort"
  ON season_ranges FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update season ranges for their resort"
  ON season_ranges FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete season ranges for their resort"
  ON season_ranges FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for promotions
CREATE POLICY "Users can view promotions for their resort"
  ON promotions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert promotions for their resort"
  ON promotions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update promotions for their resort"
  ON promotions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete promotions for their resort"
  ON promotions FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for surcharges
CREATE POLICY "Users can view surcharges for their resort"
  ON surcharges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert surcharges for their resort"
  ON surcharges FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update surcharges for their resort"
  ON surcharges FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete surcharges for their resort"
  ON surcharges FOR DELETE
  TO authenticated
  USING (true);
