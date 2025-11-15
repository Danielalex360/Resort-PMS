/*
  # Add Booking Policy Enums and Columns

  1. New Enums
    - booking_type (direct, walkin, ota, corporate)
    - payment_method (cash, bank_transfer, etc.)
    - deposit_policy_type (none, fifty_percent, etc.)
    - cancellation_reason (guest_request, duplicate_booking, etc.)
    - Add new booking_status values

  2. New Columns on bookings table
    - booking_type, deposit fields, cancellation fields, modification tracking

  3. Security
    - No RLS changes in this migration
*/

-- Create booking_type enum
DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('direct', 'walkin', 'ota', 'corporate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new booking status values
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'guaranteed';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'unpaid';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no-show';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked-in';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked-out';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'qr_duitnow',
    'card',
    'online_fpx',
    'ota_virtual_card'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deposit policy enum
DO $$ BEGIN
  CREATE TYPE deposit_policy_type AS ENUM (
    'none',
    'fifty_percent',
    'full_payment',
    'non_refundable',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Cancellation reason enum
DO $$ BEGIN
  CREATE TYPE cancellation_reason AS ENUM (
    'guest_request',
    'duplicate_booking',
    'wrong_date',
    'no_payment',
    'fraud',
    'weather',
    'medical',
    'admin_decision',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to bookings table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_type') THEN
    ALTER TABLE bookings ADD COLUMN booking_type booking_type DEFAULT 'direct';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_policy') THEN
    ALTER TABLE bookings ADD COLUMN deposit_policy deposit_policy_type DEFAULT 'fifty_percent';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_amount') THEN
    ALTER TABLE bookings ADD COLUMN deposit_amount numeric(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deposit_paid') THEN
    ALTER TABLE bookings ADD COLUMN deposit_paid boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason cancellation_reason;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancellation_notes') THEN
    ALTER TABLE bookings ADD COLUMN cancellation_notes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_by') THEN
    ALTER TABLE bookings ADD COLUMN cancelled_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'no_show_penalty') THEN
    ALTER TABLE bookings ADD COLUMN no_show_penalty numeric(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'modification_count') THEN
    ALTER TABLE bookings ADD COLUMN modification_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'last_modified_by') THEN
    ALTER TABLE bookings ADD COLUMN last_modified_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'last_modified_at') THEN
    ALTER TABLE bookings ADD COLUMN last_modified_at timestamptz;
  END IF;
END $$;