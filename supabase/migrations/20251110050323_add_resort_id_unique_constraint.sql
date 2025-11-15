/*
  # Add Unique Constraint on resort_id

  ## Changes
  
  1. Add unique constraint on resort_id column in pricing_configs
  2. This allows upsert operations with onConflict: 'resort_id'
  
  ## Note
  - This ensures one pricing config per resort
  - Removes duplicate entries if any exist
*/

-- Remove any duplicate entries first (keep the most recent one per resort)
DELETE FROM pricing_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (resort_id) id
  FROM pricing_configs
  ORDER BY resort_id, created_at DESC
);

-- Add unique constraint on resort_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_pricing_config_per_resort'
  ) THEN
    ALTER TABLE pricing_configs 
      ADD CONSTRAINT unique_pricing_config_per_resort 
      UNIQUE (resort_id);
  END IF;
END $$;
