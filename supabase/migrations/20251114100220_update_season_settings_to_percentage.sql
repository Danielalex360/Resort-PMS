/*
  # Update Season Settings to Use Percentages

  1. Changes
    - Update `mult_low`, `mult_mid`, `mult_high` columns to store percentages instead of decimal multipliers
    - Change column type to allow larger values (from numeric(5,2) to numeric(6,2))
    - Change defaults: mult_low from 0.90 to -10, mult_mid from 1.00 to 0, mult_high from 1.30 to 15
    - Update existing data to convert from decimal multipliers to percentages
  
  2. Notes
    - This makes the system more user-friendly by using percentages (e.g., 15% instead of 1.15)
    - Low season: -10% means 10% discount
    - Mid season: 0% means no change (base price)
    - High season: 15% means 15% premium
*/

-- First, change the column types to allow larger values
ALTER TABLE season_settings 
  ALTER COLUMN mult_low TYPE numeric(6,2),
  ALTER COLUMN mult_mid TYPE numeric(6,2),
  ALTER COLUMN mult_high TYPE numeric(6,2);

-- Convert existing data from decimal multipliers to percentages
-- Formula: percentage = (multiplier - 1) * 100
-- Examples: 0.90 -> -10, 1.00 -> 0, 1.30 -> 30
UPDATE season_settings
SET 
  mult_low = (mult_low - 1) * 100,
  mult_mid = (mult_mid - 1) * 100,
  mult_high = (mult_high - 1) * 100
WHERE mult_low BETWEEN 0 AND 2;

-- Update default values for the columns
ALTER TABLE season_settings 
  ALTER COLUMN mult_low SET DEFAULT -10,
  ALTER COLUMN mult_mid SET DEFAULT 0,
  ALTER COLUMN mult_high SET DEFAULT 15;