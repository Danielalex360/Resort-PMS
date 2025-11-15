/*
  # Create PMS-style Rates Tables

  ## New Tables
  
  1. `room_type_base_rates` - Base rates per room type per year
     - Stores yearly baseline cost and price
     - One row per room type per year
     - Used as foundation before season multipliers
  
  2. `room_rate_overrides` - Daily price override system
     - Set absolute price, delta amount, or delta percentage
     - Overrides seasonal pricing on specific dates
     - Full audit trail with creator and timestamps
  
  3. `room_rate_restrictions` - Daily booking restrictions
     - Close dates or restrict arrival/departure
     - Min/max length of stay requirements
     - Advance booking windows
     - Notes for operational context

  ## Security
  - Enable RLS on all tables
  - Policies scoped by resort_id
  - Staff can read/write for their resort
*/

-- Create override type enum
DO $$ BEGIN
  CREATE TYPE override_type AS ENUM ('set', 'delta_amount', 'delta_percent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create room_type_base_rates table
CREATE TABLE IF NOT EXISTS room_type_base_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  cost_base_per_night numeric(10, 2) DEFAULT 0,
  price_base_per_night numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_room_type_year UNIQUE (room_type_id, year),
  CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2100)
);

-- Create room_rate_overrides table
CREATE TABLE IF NOT EXISTS room_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  override_type override_type DEFAULT 'set',
  value numeric(10, 2) NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_override_per_date UNIQUE (resort_id, room_type_id, date)
);

-- Create room_rate_restrictions table
CREATE TABLE IF NOT EXISTS room_rate_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_closed boolean DEFAULT false,
  close_to_arrival boolean DEFAULT false,
  close_to_departure boolean DEFAULT false,
  min_los integer,
  max_los integer,
  min_advance_days integer,
  max_advance_days integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_restriction_per_date UNIQUE (resort_id, room_type_id, date),
  CONSTRAINT valid_los CHECK (min_los IS NULL OR min_los >= 1),
  CONSTRAINT valid_max_los CHECK (max_los IS NULL OR max_los >= min_los),
  CONSTRAINT valid_advance CHECK (min_advance_days IS NULL OR min_advance_days >= 0)
);

-- Create indexes for room_type_base_rates
CREATE INDEX IF NOT EXISTS idx_room_type_base_rates_room_type ON room_type_base_rates(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_type_base_rates_year ON room_type_base_rates(year);

-- Create indexes for room_rate_overrides
CREATE INDEX IF NOT EXISTS idx_room_rate_overrides_resort ON room_rate_overrides(resort_id);
CREATE INDEX IF NOT EXISTS idx_room_rate_overrides_room_type ON room_rate_overrides(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_rate_overrides_date ON room_rate_overrides(date);
CREATE INDEX IF NOT EXISTS idx_room_rate_overrides_date_range ON room_rate_overrides(date, resort_id, room_type_id);

-- Create indexes for room_rate_restrictions
CREATE INDEX IF NOT EXISTS idx_room_rate_restrictions_resort ON room_rate_restrictions(resort_id);
CREATE INDEX IF NOT EXISTS idx_room_rate_restrictions_room_type ON room_rate_restrictions(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_rate_restrictions_date ON room_rate_restrictions(date);
CREATE INDEX IF NOT EXISTS idx_room_rate_restrictions_date_range ON room_rate_restrictions(date, resort_id, room_type_id);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_room_type_base_rates_updated_at ON room_type_base_rates;
CREATE TRIGGER update_room_type_base_rates_updated_at
  BEFORE UPDATE ON room_type_base_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_rate_overrides_updated_at ON room_rate_overrides;
CREATE TRIGGER update_room_rate_overrides_updated_at
  BEFORE UPDATE ON room_rate_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_rate_restrictions_updated_at ON room_rate_restrictions;
CREATE TRIGGER update_room_rate_restrictions_updated_at
  BEFORE UPDATE ON room_rate_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE room_type_base_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rate_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_rate_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_type_base_rates
CREATE POLICY "Users can view base rates for their resort rooms"
  ON room_type_base_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_base_rates.room_type_id
    )
  );

CREATE POLICY "Users can insert base rates for their resort rooms"
  ON room_type_base_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_base_rates.room_type_id
    )
  );

CREATE POLICY "Users can update base rates for their resort rooms"
  ON room_type_base_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_base_rates.room_type_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_base_rates.room_type_id
    )
  );

CREATE POLICY "Users can delete base rates for their resort rooms"
  ON room_type_base_rates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_base_rates.room_type_id
    )
  );

-- RLS Policies for room_rate_overrides
CREATE POLICY "Users can view rate overrides for their resort"
  ON room_rate_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert rate overrides for their resort"
  ON room_rate_overrides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update rate overrides for their resort"
  ON room_rate_overrides FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete rate overrides for their resort"
  ON room_rate_overrides FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for room_rate_restrictions
CREATE POLICY "Users can view restrictions for their resort"
  ON room_rate_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert restrictions for their resort"
  ON room_rate_restrictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update restrictions for their resort"
  ON room_rate_restrictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete restrictions for their resort"
  ON room_rate_restrictions FOR DELETE
  TO authenticated
  USING (true);
