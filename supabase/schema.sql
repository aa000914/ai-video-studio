-- AI视频生产工作台 V2 数据库结构
-- 在 Supabase SQL Editor 中执行此文件

-- V1 → V2 迁移（如果已有 V1 数据库，执行以下 ALTER 语句即可）：
-- ALTER TABLE characters ADD COLUMN IF NOT EXISTS prohibited_changes TEXT;
-- ALTER TABLE scenes ADD COLUMN IF NOT EXISTS space_description TEXT;
-- ALTER TABLE scenes ADD COLUMN IF NOT EXISTS prohibited_elements TEXT;

-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT,
  platform TEXT,
  status TEXT DEFAULT '策划中',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 角色资产表
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  age TEXT,
  personality TEXT,
  appearance TEXT,
  costume TEXT,
  prompt TEXT,
  reference_url TEXT,
  prohibited_changes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 场景资产表
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  time_period TEXT,
  description TEXT,
  lighting TEXT,
  style TEXT,
  prompt TEXT,
  reference_url TEXT,
  space_description TEXT,
  prohibited_elements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 分镜表
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  shot_number INTEGER,
  duration TEXT,
  scene_name TEXT,
  characters TEXT,
  visual TEXT,
  camera TEXT,
  dialogue TEXT,
  sound TEXT,
  image_prompt TEXT,
  video_prompt TEXT,
  status TEXT DEFAULT '待生成',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI 输出记录表
CREATE TABLE ai_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT,
  input_text TEXT,
  output_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_shots_project ON shots(project_id);
CREATE INDEX idx_ai_outputs_project ON ai_outputs(project_id);
