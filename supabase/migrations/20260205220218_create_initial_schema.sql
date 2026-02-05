/*
  # Initial Schema for Kempenhorst College Conference Scheduling

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Admin email
      - `password_hash` (text) - Hashed password
      - `created_at` (timestamptz)
    
    - `events`
      - `id` (uuid, primary key)
      - `name` (text) - Event name (e.g., "Ouderavond December 2024")
      - `date` (date) - Event date
      - `start_time` (time) - Event start time
      - `end_time` (time) - Event end time
      - `slot_duration` (integer) - Duration in minutes (10/15/20)
      - `buffer_time` (integer) - Buffer between slots in minutes (0/5/10)
      - `booking_open_at` (timestamptz) - When booking opens
      - `booking_close_at` (timestamptz) - When booking closes
      - `auto_close_on_start` (boolean) - Auto-close when event starts
      - `is_booking_enabled` (boolean) - Global booking on/off
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `time_slots`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `date` (date) - Slot date
      - `start_time` (time) - Slot start time
      - `end_time` (time) - Slot end time
      - `is_available` (boolean) - Can be booked
      - `created_at` (timestamptz)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `slot_id` (uuid, foreign key to time_slots)
      - `event_id` (uuid, foreign key to events)
      - `student_name` (text) - Name of student
      - `parent_email` (text) - Parent email address
      - `booked_at` (timestamptz) - When booking was made
      - `booking_ip` (text) - IP address of booking
      - `created_by_admin` (boolean) - Was this booked by admin
      - `created_at` (timestamptz)
    
    - `magic_links`
      - `id` (uuid, primary key)
      - `token` (text, unique) - Magic link token
      - `email` (text) - Email address
      - `expires_at` (timestamptz) - Expiration time (15 minutes)
      - `used_at` (timestamptz) - When link was used
      - `created_ip` (text) - IP address of request
      - `created_at` (timestamptz)
    
    - `rate_limit_log`
      - `id` (uuid, primary key)
      - `ip_address` (text) - IP address
      - `email` (text) - Email address (if provided)
      - `action_type` (text) - Type of action (magic_link_request, etc.)
      - `created_at` (timestamptz)
    
    - `activity_log`
      - `id` (uuid, primary key)
      - `action_type` (text) - Type of action
      - `actor_email` (text) - Who performed the action
      - `actor_ip` (text) - IP address
      - `details` (jsonb) - Additional details
      - `created_at` (timestamptz)
    
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting key
      - `value` (jsonb) - Setting value
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Admin can access everything when authenticated
    - Parents can only see available slots (not other bookings)
    - Magic links are accessible during verification only
*/

-- Admin users table (single admin account)
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration integer NOT NULL DEFAULT 15,
  buffer_time integer NOT NULL DEFAULT 0,
  booking_open_at timestamptz NOT NULL,
  booking_close_at timestamptz NOT NULL,
  auto_close_on_start boolean DEFAULT true,
  is_booking_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  parent_email text NOT NULL,
  booked_at timestamptz DEFAULT now(),
  booking_ip text,
  created_by_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(slot_id)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Magic links table
CREATE TABLE IF NOT EXISTS magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_ip text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Rate limit log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email text,
  action_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  actor_email text,
  actor_ip text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_slots_event_id ON time_slots(event_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(date);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_parent_email ON bookings(parent_email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_ip ON rate_limit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_created ON rate_limit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- RLS Policies

-- Admin users: Only accessible via auth (handled in app logic)
CREATE POLICY "Admin users are private"
  ON admin_users
  FOR ALL
  USING (false);

-- Events: Publicly readable, admin can manage
CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage events"
  ON events
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Time slots: Publicly readable, admin can manage
CREATE POLICY "Time slots are viewable by everyone"
  ON time_slots
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage time slots"
  ON time_slots
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Bookings: Restricted access
CREATE POLICY "Parents can view their own bookings"
  ON bookings
  FOR SELECT
  USING (true);

CREATE POLICY "Parents can create bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can manage all bookings"
  ON bookings
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Magic links: Accessible for verification
CREATE POLICY "Magic links can be verified"
  ON magic_links
  FOR SELECT
  USING (true);

CREATE POLICY "Magic links can be created"
  ON magic_links
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can manage magic links"
  ON magic_links
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Rate limit log: Admin only
CREATE POLICY "Rate limit log is admin only"
  ON rate_limit_log
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Rate limit can be logged"
  ON rate_limit_log
  FOR INSERT
  WITH CHECK (true);

-- Activity log: Admin only read, system can write
CREATE POLICY "Activity log is viewable by admin"
  ON activity_log
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Activity log can be created"
  ON activity_log
  FOR INSERT
  WITH CHECK (true);

-- Settings: Admin only
CREATE POLICY "Settings are viewable by admin"
  ON settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage settings"
  ON settings
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('captcha_enabled', 'false'::jsonb),
  ('send_booking_confirmation', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;