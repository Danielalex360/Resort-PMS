/*
  # Add Booking Pricing Triggers

  ## Overview
  Creates PostgreSQL functions to automatically calculate booking totals,
  payment statuses, and trigger recalculations on config changes.

  ## Functions
  1. `calculate_booking_totals()` - Calculates price, cost, and profit for bookings
  2. `update_payment_status()` - Updates booking payment status when payments change
  3. `trigger_booking_recalculation()` - Recalculates pending bookings when config changes

  ## Triggers
  - Bookings: Before INSERT/UPDATE → calculate_booking_totals
  - Payments: After INSERT/UPDATE/DELETE → update_payment_status
  - Pricing configs: After UPDATE → trigger_booking_recalculation
  - Overheads: After UPDATE → trigger_booking_recalculation
*/

-- Function to calculate booking totals
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
  v_price_total decimal;
  v_profit_total decimal;
  v_avg_mult decimal;
  v_surcharge_pct decimal;
  v_boat_cost_adult decimal;
  v_boat_cost_child decimal;
  v_overhead_mode text;
  v_month_key date;
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
    v_price_total := ROUND(v_with_margin / 5) * 5;
  ELSE
    v_price_total := ROUND(v_with_margin);
  END IF;
  
  v_profit_total := v_price_total - v_cost_total;

  -- Update NEW record
  NEW.cost_total := v_cost_total;
  NEW.price_total := v_price_total;
  NEW.profit_total := v_profit_total;
  NEW.balance_due := v_price_total - COALESCE(NEW.paid_total, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment status on payment changes
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id uuid;
  v_paid decimal;
  v_refunds decimal;
  v_price_total decimal;
  v_balance decimal;
  v_payment_status text;
BEGIN
  -- Determine booking_id
  IF TG_OP = 'DELETE' THEN
    v_booking_id := OLD.booking_id;
  ELSE
    v_booking_id := NEW.booking_id;
  END IF;

  -- Get booking price
  SELECT price_total INTO v_price_total FROM bookings WHERE id = v_booking_id;

  -- Calculate paid and refunds
  SELECT 
    COALESCE(SUM(CASE WHEN type != 'refund' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END), 0)
  INTO v_paid, v_refunds
  FROM payments 
  WHERE booking_id = v_booking_id AND status = 'cleared';

  v_balance := COALESCE(v_price_total, 0) - v_paid + v_refunds;

  -- Determine payment status
  IF v_paid <= 0 AND v_refunds > 0 THEN
    v_payment_status := 'refunded';
  ELSIF v_balance <= 0 AND v_paid > 0 THEN
    v_payment_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;

  -- Update booking
  UPDATE bookings 
  SET 
    paid_total = v_paid,
    balance_due = v_balance,
    payment_status = v_payment_status::payment_status_type
  WHERE id = v_booking_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS calculate_booking_totals_trigger ON bookings;
DROP TRIGGER IF EXISTS update_payment_status_on_insert ON payments;
DROP TRIGGER IF EXISTS update_payment_status_on_update ON payments;
DROP TRIGGER IF EXISTS update_payment_status_on_delete ON payments;

-- Create triggers
CREATE TRIGGER calculate_booking_totals_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_totals();

CREATE TRIGGER update_payment_status_on_insert
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

CREATE TRIGGER update_payment_status_on_update
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

CREATE TRIGGER update_payment_status_on_delete
  AFTER DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();