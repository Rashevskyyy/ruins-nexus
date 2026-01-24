-- ========================================
-- Cosmic Frontier - Database Schema
-- ========================================
-- Run this in Supabase SQL Editor

-- Player Profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    total_prestige INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles (for leaderboards)
CREATE POLICY "Profiles are viewable by everyone" 
    ON player_profiles FOR SELECT 
    USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
    ON player_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
    ON player_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ========================================
-- Match History (optional, for stats)
-- ========================================

CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    players JSONB NOT NULL, -- [{id, name, prestige, place}]
    winner_id UUID REFERENCES player_profiles(id),
    total_rounds INTEGER,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read match history
CREATE POLICY "Match history is viewable by everyone" 
    ON match_history FOR SELECT 
    USING (true);

-- Policy: Only server can insert (via service role)
-- For now, allow authenticated users to insert
CREATE POLICY "Authenticated users can insert matches" 
    ON match_history FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- ========================================
-- Helper Functions
-- ========================================

-- Function to update player stats after a game
CREATE OR REPLACE FUNCTION update_player_stats(
    p_user_id UUID,
    p_won BOOLEAN,
    p_prestige INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE player_profiles
    SET 
        total_games = total_games + 1,
        wins = wins + CASE WHEN p_won THEN 1 ELSE 0 END,
        total_prestige = total_prestige + p_prestige
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profiles_prestige ON player_profiles(total_prestige DESC);
CREATE INDEX IF NOT EXISTS idx_matches_created ON match_history(created_at DESC);
