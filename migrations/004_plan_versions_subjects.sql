-- V1.3: 策划案版本 + 主体库升级 + 多剧集预留 + 音画预留
-- 在 Supabase SQL Editor 中执行

-- 1. Plan versions 表
CREATE TABLE IF NOT EXISTS plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  summary TEXT,
  style TEXT,
  subjects_snapshot JSONB,
  scenes_snapshot JSONB,
  shot_script_snapshot JSONB,
  source_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_versions_project ON plan_versions(project_id);

-- 2. 主体表增加类型字段
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subject_type TEXT DEFAULT 'character';
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS subject_type TEXT DEFAULT 'scene';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_name TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS locked_traits TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS locked_traits TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;

-- 3. Projects 增加多剧集预留字段
ALTER TABLE projects ADD COLUMN IF NOT EXISTS episode_count INT DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_episode INT DEFAULT 1;

-- 4. Shots 增加字段
ALTER TABLE shots ADD COLUMN IF NOT EXISTS audio_prompt TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS shot_index INT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS story_text TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS camera_angle TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS episode_number INT DEFAULT 1;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS selected_image_asset_id UUID;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS selected_video_asset_id UUID;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS final_asset_id UUID;

-- 5. generated_assets 增加类型枚举字段
ALTER TABLE generated_assets DROP CONSTRAINT IF EXISTS generated_assets_type_check;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS prompt_snapshot TEXT;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS params JSONB;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_generated_assets_final ON generated_assets(is_final) WHERE is_final = true;
CREATE INDEX IF NOT EXISTS idx_shots_episode ON shots(project_id, episode_number);
