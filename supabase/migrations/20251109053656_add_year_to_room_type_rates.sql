/*
  # Add Year to Room Type Rates

  ## Changes
  - Add year column to room_type_rates
  - Update unique constraint to include year
  - Migrate existing data to current year

  ## Notes
  - Allows tracking historical pricing across years
  - Maintains seasonal pricing structure
*/

-- Add year column to room_type_rates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_type_rates' AND column_name = 'year'
  ) THEN
    ALTER TABLE room_type_rates ADD COLUMN year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
  END IF;
END $$;

-- Update existing records to have current year
UPDATE room_type_rates 
SET year = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE year IS NULL;

-- Make year not null
ALTER TABLE room_type_rates ALTER COLUMN year SET NOT NULL;

-- Drop old unique constraint
ALTER TABLE room_type_rates DROP CONSTRAINT IF EXISTS room_type_rates_room_type_id_season_key;

-- Add new unique constraint including year
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'room_type_rates_room_type_id_season_year_key'
  ) THEN
    ALTER TABLE room_type_rates 
    ADD CONSTRAINT room_type_rates_room_type_id_season_year_key 
    UNIQUE(room_type_id, season, year);
  END IF;
END $$;

-- Create index on year for faster queries
CREATE INDEX IF NOT EXISTS idx_room_type_rates_year ON room_type_rates(year);
