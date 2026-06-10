-- V2.8: Add metadata JSONB column to characters and scenes for prompt_cn storage
ALTER TABLE characters ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
