-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('GENERAL', 'GAMING', 'MUSIC')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create room_users table
CREATE TABLE IF NOT EXISTS room_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(room_id, user_id)
);

-- Create webrtc_signals table
CREATE TABLE IF NOT EXISTS webrtc_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    signal TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Create some initial rooms
INSERT INTO rooms (name, type) VALUES
    ('General Chat', 'GENERAL'),
    ('Gaming Lounge', 'GAMING'),
    ('Music Room', 'MUSIC')
ON CONFLICT DO NOTHING;

-- Enable RLS
DO $$ 
BEGIN
    ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE room_users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE webrtc_signals ENABLE ROW LEVEL SECURITY;
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
    DROP POLICY IF EXISTS "Anyone can read room_users" ON room_users;
    DROP POLICY IF EXISTS "Users can join/leave rooms" ON room_users;
    DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert signals" ON webrtc_signals;
    DROP POLICY IF EXISTS "Users can read signals sent to them" ON webrtc_signals;
EXCEPTION 
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Anyone can read rooms"
    ON rooms FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anyone can read room_users"
    ON room_users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can join/leave rooms"
    ON room_users FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert signals"
    ON webrtc_signals FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can read signals sent to them"
    ON webrtc_signals FOR SELECT
    TO authenticated
    USING (auth.uid() = to_user_id);

-- Create a function to clean up old signals
CREATE OR REPLACE FUNCTION delete_old_signals() RETURNS void AS $$
BEGIN
    DELETE FROM webrtc_signals
    WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql; 