-- =====================================================
-- AI Game Platform - Supabase Database Schema
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up the database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Profiles Table (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Games Table
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover TEXT,
  category TEXT NOT NULL,
  plays INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  author_username TEXT,
  author_avatar TEXT,
  tags TEXT[] DEFAULT '{}',
  plot TEXT,
  gameplay TEXT,
  player_identity TEXT,
  game_goal TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'offline')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Game NPCs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS game_npcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT,
  card_image TEXT,
  description TEXT,
  personality TEXT,
  relationship TEXT,
  background TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Game Likes Table (for tracking user likes)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- =====================================================
-- Create Indexes for Better Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_games_author_id ON games(author_id);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_npcs_game_id ON game_npcs(game_id);
CREATE INDEX IF NOT EXISTS idx_game_likes_user_id ON game_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_game_likes_game_id ON game_likes(game_id);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Published games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Users can create games" ON games;
DROP POLICY IF EXISTS "Users can update own games" ON games;
DROP POLICY IF EXISTS "Users can delete own games" ON games;
DROP POLICY IF EXISTS "NPCs are viewable for published games" ON game_npcs;
DROP POLICY IF EXISTS "Game authors can manage NPCs" ON game_npcs;
DROP POLICY IF EXISTS "Users can manage own likes" ON game_likes;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Games: Everyone can read published games
CREATE POLICY "Published games are viewable by everyone"
  ON games FOR SELECT USING (status = 'published');

-- Games: Users can create games
CREATE POLICY "Users can create games"
  ON games FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Games: Users can update their own games
CREATE POLICY "Users can update own games"
  ON games FOR UPDATE USING (auth.uid() = author_id);

-- Games: Users can delete their own games
CREATE POLICY "Users can delete own games"
  ON games FOR DELETE USING (auth.uid() = author_id);

-- Game NPCs: Read access for published game NPCs
CREATE POLICY "NPCs are viewable for published games"
  ON game_npcs FOR SELECT USING (
    EXISTS (SELECT 1 FROM games WHERE id = game_id AND status = 'published')
  );

-- Game NPCs: Create/Update/Delete for game authors
CREATE POLICY "Game authors can manage NPCs"
  ON game_npcs FOR ALL USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE id = game_id AND author_id = auth.uid()
    )
  );

-- Game Likes: Users can manage their own likes
CREATE POLICY "Users can manage own likes"
  ON game_likes FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- Function to handle new user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || COALESCE(NEW.raw_user_meta_data->>'username', NEW.id::TEXT)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
END $$;
