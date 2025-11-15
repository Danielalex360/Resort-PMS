/*
  # Fix Pricing Configs Table - Add Missing Columns

  ## Changes
  
  1. Add missing add-on columns (adult/child split)
  2. Add profit_margin_pct and round_to_rm5 if missing
  3. Add updated_at trigger
  4. Ensure RLS policies
  
  ## Note
  - Works with existing table structure that has year column
  - Only adds missing columns, doesn't modify existing ones
*/

-- Make year nullable with default if it's NOT NULL
DO $$
BEGIN
  ALTER TABLE pricing_configs ALTER COLUMN year DROP NOT NULL;
  ALTER TABLE pricing_configs ALTER COLUMN year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add missing BBQ adult/child split columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'bbq_cost_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN bbq_cost_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'bbq_cost_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN bbq_cost_child numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'bbq_price_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN bbq_price_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'bbq_price_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN bbq_price_child numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add missing Candlelight Dinner adult/child split columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'cld_cost_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN cld_cost_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'cld_cost_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN cld_cost_child numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'cld_price_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN cld_price_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'cld_price_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN cld_price_child numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add missing Honeymoon adult/child split columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'hmoon_cost_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN hmoon_cost_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'hmoon_cost_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN hmoon_cost_child numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'hmoon_price_adult') THEN
    ALTER TABLE pricing_configs ADD COLUMN hmoon_price_adult numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'hmoon_price_child') THEN
    ALTER TABLE pricing_configs ADD COLUMN hmoon_price_child numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add profit_margin_pct if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'profit_margin_pct') THEN
    ALTER TABLE pricing_configs ADD COLUMN profit_margin_pct numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add round_to_rm5 if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'round_to_rm5') THEN
    ALTER TABLE pricing_configs ADD COLUMN round_to_rm5 boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add updated_at if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pricing_configs' AND column_name = 'updated_at') THEN
    ALTER TABLE pricing_configs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_pricing_configs_updated_at ON pricing_configs;

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_configs_updated_at
  BEFORE UPDATE ON pricing_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled
ALTER TABLE pricing_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view pricing configs" ON pricing_configs;
DROP POLICY IF EXISTS "Users can insert pricing configs" ON pricing_configs;
DROP POLICY IF EXISTS "Users can update pricing configs" ON pricing_configs;
DROP POLICY IF EXISTS "Users can delete pricing configs" ON pricing_configs;
DROP POLICY IF EXISTS "Users can view pricing configs for their resorts" ON pricing_configs;
DROP POLICY IF EXISTS "Users can insert pricing configs for their resorts" ON pricing_configs;
DROP POLICY IF EXISTS "Users can update pricing configs for their resorts" ON pricing_configs;
DROP POLICY IF EXISTS "Users can delete pricing configs for their resorts" ON pricing_configs;

-- Create RLS policies
CREATE POLICY "Users can view pricing configs for their resorts"
  ON pricing_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = pricing_configs.resort_id
    )
  );

CREATE POLICY "Users can insert pricing configs for their resorts"
  ON pricing_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = pricing_configs.resort_id
    )
  );

CREATE POLICY "Users can update pricing configs for their resorts"
  ON pricing_configs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = pricing_configs.resort_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = pricing_configs.resort_id
    )
  );

CREATE POLICY "Users can delete pricing configs for their resorts"
  ON pricing_configs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resorts
      WHERE resorts.id = pricing_configs.resort_id
    )
  );
