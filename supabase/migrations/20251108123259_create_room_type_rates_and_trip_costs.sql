/*
  # Create Room Type Rates and Trip Costs

  ## New Table
  - `room_type_rates` - Per-season pricing for each room type
    - Tracks cost and price per night for low/mid/high seasons
    - Unique constraint on (room_type_id, season)

  ## Updates to pricing_configs
  - Add per-trip cost columns for boat and activities
  - Maintains existing per-pax pricing columns

  ## Indexes and Security
  - Add appropriate indexes
  - Enable RLS with policies
*/

-- Create season enum if not exists
DO $$ BEGIN
  CREATE TYPE season_type AS ENUM ('low', 'mid', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create room_type_rates table
CREATE TABLE IF NOT EXISTS room_type_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  season season_type NOT NULL,
  cost_per_night decimal(10, 2) NOT NULL DEFAULT 0,
  price_per_night decimal(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_type_id, season)
);

-- Add new columns to pricing_configs for per-trip costs
DO $$
BEGIN
  -- Boat return trip cost
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_configs' AND column_name = 'boat_cost_return_trip'
  ) THEN
    ALTER TABLE pricing_configs ADD COLUMN boat_cost_return_trip decimal(10, 2) DEFAULT 0;
  END IF;

  -- Activities trip costs (per booking, not per pax)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_configs' AND column_name = 'activities_3i_cost_trip'
  ) THEN
    ALTER TABLE pricing_configs ADD COLUMN activities_3i_cost_trip decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_configs' AND column_name = 'activities_5i_cost_trip'
  ) THEN
    ALTER TABLE pricing_configs ADD COLUMN activities_5i_cost_trip decimal(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pricing_configs' AND column_name = 'activities_8i_cost_trip'
  ) THEN
    ALTER TABLE pricing_configs ADD COLUMN activities_8i_cost_trip decimal(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_type_rates_room_type ON room_type_rates(room_type_id);
CREATE INDEX IF NOT EXISTS idx_room_type_rates_season ON room_type_rates(season);

-- Create trigger for room_type_rates updated_at
DROP TRIGGER IF EXISTS update_room_type_rates_updated_at ON room_type_rates;
CREATE TRIGGER update_room_type_rates_updated_at
  BEFORE UPDATE ON room_type_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE room_type_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_type_rates
CREATE POLICY "Users can view room type rates"
  ON room_type_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_rates.room_type_id
    )
  );

CREATE POLICY "Users can insert room type rates"
  ON room_type_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_rates.room_type_id
    )
  );

CREATE POLICY "Users can update room type rates"
  ON room_type_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_rates.room_type_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_rates.room_type_id
    )
  );

CREATE POLICY "Users can delete room type rates"
  ON room_type_rates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_types
      WHERE room_types.id = room_type_rates.room_type_id
    )
  );

-- Seed room_type_rates for all existing room types
INSERT INTO room_type_rates (room_type_id, season, cost_per_night, price_per_night)
SELECT 
  rt.id,
  s.season,
  0,
  0
FROM 
  room_types rt
CROSS JOIN 
  (VALUES ('low'::season_type), ('mid'::season_type), ('high'::season_type)) AS s(season)
WHERE 
  rt.is_active = true
ON CONFLICT (room_type_id, season) DO NOTHING;
