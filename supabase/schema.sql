-- Rork AI Builder Clone - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  expo_slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT DEFAULT 'typescript',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- Messages table (chat history)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  files_changed TEXT[],
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_model TEXT DEFAULT 'gemini',
  github_token TEXT,
  expo_token TEXT,
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for project_files
DROP POLICY IF EXISTS "Users can CRUD files of own projects" ON project_files;
CREATE POLICY "Users can CRUD files of own projects" ON project_files
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can CRUD messages of own projects" ON messages;
CREATE POLICY "Users can CRUD messages of own projects" ON messages
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "Users can CRUD own settings" ON user_settings;
CREATE POLICY "Users can CRUD own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_files_updated_at ON project_files;
CREATE TRIGGER update_project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user_settings when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, preferred_model, theme)
  VALUES (NEW.id, 'gemini', 'dark')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
