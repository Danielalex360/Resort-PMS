/*
  # Add Completed Status to Booking Status Enum

  1. Changes
    - Add 'completed' to the booking_status enum type
    - This allows bookings to be marked as completed after checkout
*/

-- Add 'completed' to booking_status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'completed' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'completed';
  END IF;
END $$;
