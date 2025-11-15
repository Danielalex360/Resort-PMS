/*
  # Add Guest Sync Trigger

  ## Changes
  - Create function to sync guest data on booking changes
  - Add trigger to bookings table to update guest records
*/

-- Function to sync guest data when booking is created or updated
CREATE OR REPLACE FUNCTION sync_guest_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_guest record;
  v_increment_stays integer;
  v_updated_stays integer;
  v_updated_spent decimal;
  v_last_check_in date;
BEGIN
  -- Skip if no guest identification available
  IF NEW.email IS NULL AND NEW.phone IS NULL AND NEW.guest_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find existing guest
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT * INTO v_guest FROM guests 
    WHERE resort_id = NEW.resort_id 
    AND email = LOWER(TRIM(NEW.email))
    LIMIT 1;
  ELSIF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    SELECT * INTO v_guest FROM guests 
    WHERE resort_id = NEW.resort_id 
    AND phone = TRIM(NEW.phone)
    LIMIT 1;
  ELSIF NEW.guest_name IS NOT NULL AND NEW.guest_name != '' THEN
    SELECT * INTO v_guest FROM guests 
    WHERE resort_id = NEW.resort_id 
    AND name = TRIM(NEW.guest_name)
    LIMIT 1;
  END IF;

  -- Create guest if doesn't exist
  IF v_guest IS NULL THEN
    INSERT INTO guests (
      resort_id,
      name,
      email,
      phone,
      nationality,
      total_stays,
      total_spent,
      last_check_in
    ) VALUES (
      NEW.resort_id,
      COALESCE(NEW.guest_name, 'Guest'),
      CASE WHEN NEW.email IS NOT NULL AND NEW.email != '' 
           THEN LOWER(TRIM(NEW.email)) 
           ELSE NULL END,
      CASE WHEN NEW.phone IS NOT NULL AND NEW.phone != '' 
           THEN TRIM(NEW.phone) 
           ELSE NULL END,
      NEW.nationality,
      0,
      0,
      NULL
    ) RETURNING * INTO v_guest;
  END IF;

  -- Determine if we should increment stays
  v_increment_stays := 0;
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    v_increment_stays := 1;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    v_increment_stays := 1;
  END IF;

  -- Calculate updated values
  v_updated_stays := COALESCE(v_guest.total_stays, 0) + v_increment_stays;
  v_updated_spent := COALESCE(v_guest.total_spent, 0) + COALESCE(NEW.price_total, 0);
  
  -- Update last check-in date
  IF NEW.check_in IS NOT NULL AND 
     (v_guest.last_check_in IS NULL OR NEW.check_in > v_guest.last_check_in) THEN
    v_last_check_in := NEW.check_in;
  ELSE
    v_last_check_in := v_guest.last_check_in;
  END IF;

  -- Update guest record
  UPDATE guests SET
    name = COALESCE(NEW.guest_name, name),
    email = CASE WHEN NEW.email IS NOT NULL AND NEW.email != '' 
                 THEN LOWER(TRIM(NEW.email)) 
                 ELSE email END,
    phone = CASE WHEN NEW.phone IS NOT NULL AND NEW.phone != '' 
                 THEN TRIM(NEW.phone) 
                 ELSE phone END,
    nationality = COALESCE(NEW.nationality, nationality),
    total_stays = v_updated_stays,
    total_spent = v_updated_spent,
    last_check_in = v_last_check_in,
    updated_at = now()
  WHERE id = v_guest.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_guest_on_booking_trigger ON bookings;

-- Create trigger for guest sync (after the booking totals are calculated)
CREATE TRIGGER sync_guest_on_booking_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION sync_guest_on_booking();
