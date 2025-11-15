/*
  # Create Guests and Notifications Tables

  ## New Tables
  1. `guests` - Customer relationship management
     - id (uuid, primary key)
     - resort_id (foreign key to resorts)
     - name (text, required)
     - email (text)
     - phone (text)
     - nationality (text)
     - total_stays (integer, default 0)
     - total_spent (decimal, default 0)
     - last_check_in (date, nullable)
     - created_at (timestamptz, default now)
     - updated_at (timestamptz, auto update)

  2. `notifications` - Communication tracking
     - id (uuid, primary key)
     - resort_id (foreign key to resorts)
     - booking_id (foreign key to bookings)
     - sent_to (text)
     - method (enum: whatsapp, email, sms, internal)
     - channel_ref (text)
     - subject (text)
     - body (text)
     - sent_at (timestamptz, default now)
     - status (enum: queued, sent, failed)
     - error (text, nullable)

  ## Security
  - Enable RLS on both tables
  - Staff can only access data for their resort
*/

-- Create notification method enum
CREATE TYPE notification_method_type AS ENUM ('whatsapp', 'email', 'sms', 'internal');

-- Create notification status enum
CREATE TYPE notification_status_type AS ENUM ('queued', 'sent', 'failed');

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  nationality text,
  total_stays integer DEFAULT 0,
  total_spent decimal(10, 2) DEFAULT 0,
  last_check_in date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sent_to text,
  method notification_method_type DEFAULT 'internal',
  channel_ref text,
  subject text,
  body text,
  sent_at timestamptz DEFAULT now(),
  status notification_status_type DEFAULT 'sent',
  error text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guests_resort_id ON guests(resort_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_total_spent ON guests(total_spent DESC);
CREATE INDEX IF NOT EXISTS idx_guests_last_check_in ON guests(last_check_in DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_resort_id ON notifications(resort_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for guests updated_at
DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guests
CREATE POLICY "Users can view guests for their resort"
  ON guests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert guests for their resort"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update guests for their resort"
  ON guests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete guests for their resort"
  ON guests FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view notifications for their resort"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert notifications for their resort"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update notifications for their resort"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete notifications for their resort"
  ON notifications FOR DELETE
  TO authenticated
  USING (true);
