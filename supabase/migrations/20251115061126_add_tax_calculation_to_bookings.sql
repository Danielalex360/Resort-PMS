/*
  # Add Tax Calculation to Booking Totals

  ## Changes
  - Update calculate_booking_totals() function to include tax calculation
  - Taxes are applied based on their configuration (per_total, per_room, per_pax, per_night)
  - Tax amount is added to the price_total

  ## Tax Calculation Logic
  - Load all active taxes for the resort
  - Apply each tax based on its application_type
  - Add total tax amount to final price
*/

CREATE OR REPLACE FUNCTION calculate_booking_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_room record;
  v_cfg record;
  v_ss record;
  v_meal record;
  v_pkg record;
  v_ovh record;
  v_nights integer;
  v_room_cost decimal;
  v_room_price decimal;
  v_meals_cost decimal;
  v_meals_price decimal;
  v_boat_cost decimal;
  v_boat_price decimal;
  v_base_cost decimal;
  v_base_price decimal;
  v_addons_cost decimal;
  v_addons_price decimal;
  v_overhead decimal;
  v_cost_total decimal;
  v_season_price decimal;
  v_after_sg decimal;
  v_with_margin decimal;
  v_price_before_tax decimal;
  v_tax_total decimal;
  v_price_total decimal;
  v_profit_total decimal;
  v_avg_mult decimal;
  v_surcharge_pct decimal;
  v_boat_cost_adult decimal;
  v_boat_cost_child decimal;
  v_overhead_mode text;
  v_month_key date;
  v_tax record;
  v_tax_amount decimal;
  v_pax_count integer;
BEGIN
  -- Calculate nights
  v_nights := GREATEST(1, NEW.check_out - NEW.check_in);
  NEW.nights := v_nights;

  -- Get room type
  SELECT * INTO v_room FROM room_types WHERE id = NEW.room_type_id;
  
  -- Get pricing config for the year
  SELECT * INTO v_cfg FROM pricing_configs 
  WHERE resort_id = NEW.resort_id 
  AND year = EXTRACT(YEAR FROM NEW.check_in)
  LIMIT 1;
  
  -- Get season settings
  SELECT * INTO v_ss FROM season_settings 
  WHERE resort_id = NEW.resort_id 
  LIMIT 1;

  -- Get meal plan
  IF NEW.meal_plan_id IS NOT NULL THEN
    SELECT * INTO v_meal FROM meal_plans WHERE id = NEW.meal_plan_id;
  ELSIF NEW.package_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM packages WHERE id = NEW.package_id;
    IF v_pkg.meal_plan_id IS NOT NULL THEN
      SELECT * INTO v_meal FROM meal_plans WHERE id = v_pkg.meal_plan_id;
    END IF;
  END IF;

  -- Get overhead for the month
  v_month_key := DATE_TRUNC('month', NEW.check_in);
  SELECT * INTO v_ovh FROM overheads 
  WHERE resort_id = NEW.resort_id 
  AND month = v_month_key 
  LIMIT 1;

  -- Calculate average season multiplier (simplified - using mid season for now)
  v_avg_mult := COALESCE(v_ss.mult_mid, 1.0);
  v_surcharge_pct := COALESCE(v_ss.surcharge_weekend_pct, 0);

  -- Determine boat cost source
  IF v_cfg.boat_cost_source = 'vendor' THEN
    v_boat_cost_adult := COALESCE(v_cfg.cost_boat_vendor_adult, 0);
    v_boat_cost_child := COALESCE(v_cfg.cost_boat_vendor_child, 0);
  ELSE
    v_boat_cost_adult := COALESCE(v_cfg.cost_boat_adult, 0);
    v_boat_cost_child := COALESCE(v_cfg.cost_boat_child, 0);
  END IF;

  -- Calculate add-ons from package
  v_addons_cost := 0;
  v_addons_price := 0;
  IF NEW.package_id IS NOT NULL AND v_pkg IS NOT NULL THEN
    IF v_pkg.activity_variant = '3i' THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_activities_3i, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_activities_3i, 0);
    ELSIF v_pkg.activity_variant = '5i' THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_activities_5i, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_activities_5i, 0);
    ELSIF v_pkg.activity_variant = '8i' THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_activities_8i, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_activities_8i, 0);
    END IF;
    
    IF v_pkg.include_bbq THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_bbq, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_bbq, 0);
    END IF;
    
    IF v_pkg.include_candle THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_candle, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_candle, 0);
    END IF;
    
    IF v_pkg.include_honeymoon THEN
      v_addons_cost := v_addons_cost + COALESCE(v_cfg.cost_honeymoon, 0);
      v_addons_price := v_addons_price + COALESCE(v_cfg.price_honeymoon, 0);
    END IF;
  END IF;

  -- Calculate component costs and prices
  v_room_cost := COALESCE(v_cfg.cost_room, 0) * COALESCE(v_room.multiplier, 1) * v_nights;
  v_room_price := COALESCE(v_cfg.price_room, 0) * COALESCE(v_room.multiplier, 1) * v_nights;
  
  v_meals_cost := (COALESCE(v_meal.cost_adult, 0) * COALESCE(NEW.pax_adult, 2) + 
                   COALESCE(v_meal.cost_child, 0) * COALESCE(NEW.pax_child, 0)) * v_nights;
  v_meals_price := (COALESCE(v_meal.price_adult, 0) * COALESCE(NEW.pax_adult, 2) + 
                    COALESCE(v_meal.price_child, 0) * COALESCE(NEW.pax_child, 0)) * v_nights;
  
  v_boat_cost := (v_boat_cost_adult * COALESCE(NEW.pax_adult, 2) + 
                  v_boat_cost_child * COALESCE(NEW.pax_child, 0)) * v_nights;
  v_boat_price := (COALESCE(v_cfg.price_boat_adult, 0) * COALESCE(NEW.pax_adult, 2) + 
                   COALESCE(v_cfg.price_boat_child, 0) * COALESCE(NEW.pax_child, 0)) * v_nights;

  v_base_cost := v_room_cost + v_meals_cost + v_boat_cost + v_addons_cost;
  v_base_price := v_room_price + v_meals_price + v_boat_price + v_addons_price;

  -- Calculate overhead
  v_overhead_mode := COALESCE(v_cfg.overhead_mode, v_ovh.allocation_mode, 'per_room_day');
  IF v_overhead_mode = 'per_room_day' THEN
    v_overhead := COALESCE(v_ovh.overhead_per_room_day, 0) * v_nights;
  ELSE
    v_overhead := COALESCE(v_cfg.overhead_fixed_per_package, v_ovh.fixed_per_package, 0);
  END IF;

  v_cost_total := v_base_cost + v_overhead;
  v_season_price := v_base_price * v_avg_mult;
  v_after_sg := v_season_price * (1 + v_surcharge_pct / 100);
  v_with_margin := v_after_sg * (1 + COALESCE(v_ss.profit_margin_pct, 25) / 100);
  
  -- Round to RM5 if enabled
  IF COALESCE(v_ss.round_to_rm5, true) THEN
    v_price_before_tax := ROUND(v_with_margin / 5) * 5;
  ELSE
    v_price_before_tax := ROUND(v_with_margin);
  END IF;

  -- Calculate taxes
  v_tax_total := 0;
  FOR v_tax IN 
    SELECT * FROM taxes 
    WHERE resort_id = NEW.resort_id 
    AND is_active = true
    ORDER BY display_order
  LOOP
    v_tax_amount := 0;
    v_pax_count := 0;
    
    -- Calculate applicable pax count for per_pax taxes
    IF v_tax.apply_to_adults THEN
      v_pax_count := v_pax_count + COALESCE(NEW.pax_adult, 0);
    END IF;
    IF v_tax.apply_to_children THEN
      v_pax_count := v_pax_count + COALESCE(NEW.pax_child, 0);
    END IF;
    
    -- Calculate tax based on application type
    CASE v_tax.application_type
      WHEN 'per_total' THEN
        IF v_tax.is_percentage THEN
          v_tax_amount := v_price_before_tax * (v_tax.rate / 100);
        ELSE
          v_tax_amount := v_tax.rate;
        END IF;
      
      WHEN 'per_room' THEN
        IF v_tax.is_percentage THEN
          v_tax_amount := v_price_before_tax * (v_tax.rate / 100);
        ELSE
          v_tax_amount := v_tax.rate;
        END IF;
      
      WHEN 'per_pax' THEN
        IF v_pax_count > 0 THEN
          IF v_tax.is_percentage THEN
            v_tax_amount := (v_price_before_tax / v_pax_count) * (v_tax.rate / 100) * v_pax_count;
          ELSE
            v_tax_amount := v_tax.rate * v_pax_count;
          END IF;
        END IF;
      
      WHEN 'per_night' THEN
        IF v_tax.is_percentage THEN
          v_tax_amount := (v_price_before_tax / v_nights) * (v_tax.rate / 100) * v_nights;
        ELSE
          v_tax_amount := v_tax.rate * v_nights;
        END IF;
    END CASE;
    
    v_tax_total := v_tax_total + v_tax_amount;
  END LOOP;

  -- Final price including tax
  v_price_total := v_price_before_tax + v_tax_total;
  v_profit_total := v_price_total - v_cost_total;

  -- Update NEW record
  NEW.cost_total := v_cost_total;
  NEW.price_total := v_price_total;
  NEW.profit_total := v_profit_total;
  NEW.balance_due := v_price_total - COALESCE(NEW.paid_total, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
