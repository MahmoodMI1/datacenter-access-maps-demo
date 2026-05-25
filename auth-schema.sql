-- ============================================
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql
-- ============================================

-- Profiles table (one row per auth user)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: avoids RLS recursion when policies check role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin sees all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Drop the old open policies
DROP POLICY "Allow all on maps" ON maps;
DROP POLICY "Allow all on nodes" ON nodes;

-- Maps: everyone authenticated can read; only admins can write
CREATE POLICY "Read maps" ON maps FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin insert maps" ON maps FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update maps" ON maps FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete maps" ON maps FOR DELETE USING (is_admin());

-- Nodes: everyone authenticated can read; only admins can write
CREATE POLICY "Read nodes" ON nodes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin insert nodes" ON nodes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update nodes" ON nodes FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete nodes" ON nodes FOR DELETE USING (is_admin());
