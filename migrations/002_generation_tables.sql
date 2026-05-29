-- Migration V6: Add generation_tasks and generated_assets tables
-- Run this in Supabase SQL Editor after migration 001

-- 1. Generation tasks table
CREATE TABLE IF NOT EXISTS generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id UUID REFERENCES shots(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 't2v', 'i2v', 'video_edit')),
  provider TEXT DEFAULT 'dashscope',
  model TEXT,
  prompt TEXT,
  input_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  task_id TEXT,
  result_url TEXT,
  error_message TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Generated assets table
CREATE TABLE IF NOT EXISTS generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id UUID REFERENCES shots(id) ON DELETE SET NULL,
  task_id UUID REFERENCES generation_tasks(id) ON DELETE SET NULL,
  type TEXT,
  url TEXT,
  prompt TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add image_url/video_url to shots (if not exist)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_tasks_project ON generation_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_shot ON generation_tasks(shot_id);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status ON generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_assets_project ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_shot ON generated_assets(shot_id);

-- 4. Function to auto-update updated_at on generation_tasks
CREATE OR REPLACE FUNCTION update_generation_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (safe for re-run)
DROP TRIGGER IF EXISTS trg_generation_tasks_updated_at ON generation_tasks;
CREATE TRIGGER trg_generation_tasks_updated_at
  BEFORE UPDATE ON generation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_generation_tasks_updated_at();
