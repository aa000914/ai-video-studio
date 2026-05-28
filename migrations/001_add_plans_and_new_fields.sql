-- Migration: Add plans table and new fields for V1 Seko-style workflow
-- Run this in Supabase SQL Editor

-- 1. Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  summary TEXT,
  art_style TEXT,
  content_type TEXT,
  mode TEXT,
  aspect_ratio TEXT,
  episode_count INTEGER DEFAULT 1,
  storyboard_count INTEGER DEFAULT 12,
  music_style TEXT,
  narration_style TEXT,
  script_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add new columns to characters (if not exist)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS prompt_front TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS prompt_back TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS prompt_overhead TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subject_image_url TEXT;

-- 3. Add new columns to scenes (if not exist)
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS prompt_front TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS prompt_back TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS prompt_overhead TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS subject_image_url TEXT;

-- 4. Add new columns to shots (if not exist)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS refined_image_prompt TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS refined_video_prompt TEXT;
