-- V2.7.3: Ensure subject_image_url and metadata fields exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS subject_image_url TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS subject_image_url TEXT;
ALTER TABLE generated_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
