-- V1.2: 镜头级工作流字段
-- 在 Supabase SQL Editor 中执行

-- 1. shots 增加 selected image/video 字段
ALTER TABLE shots ADD COLUMN IF NOT EXISTS selected_image_url TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS selected_video_url TEXT;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS negative_prompt TEXT;

-- 2. generation_tasks 放宽 status 约束（兼容新旧值）
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_status_check;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_status_check
  CHECK (status IN ('queued','pending','running','succeeded','failed','cancelled'));

-- 3. generation_tasks 放宽 type 约束
ALTER TABLE generation_tasks DROP CONSTRAINT IF EXISTS generation_tasks_type_check;
ALTER TABLE generation_tasks ADD CONSTRAINT generation_tasks_type_check
  CHECK (type IN ('image','t2v','i2v','video_edit',
                  'text_to_image','image_to_video','text_to_video'));

-- 4. generated_assets 增加字段
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;
