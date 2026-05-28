import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("缺少 Supabase 环境变量");
  }
  return createClient(url, serviceKey);
}

// Column discovery cache — auto-adapts when migration adds new columns
const _columnCache = new Map();
const _cacheTime = new Map();
const CACHE_TTL = 60000; // 1 minute

// Fallback column lists for empty tables (V1 schema)
// When table has rows, actual columns are discovered from row keys
// These ensure inserts work even when tables are empty
const FALLBACK_COLUMNS = {
  plans: new Set([
    "id", "project_id", "summary", "art_style", "content_type",
    "mode", "aspect_ratio", "episode_count", "storyboard_count",
    "music_style", "narration_style", "script_text", "created_at",
  ]),
  characters: new Set([
    "id", "project_id", "name", "role", "age", "personality",
    "appearance", "costume", "prompt", "prohibited_changes",
    "prompt_front", "prompt_back", "prompt_overhead",
    "subject_image_url", "reference_url", "notes", "created_at",
  ]),
  scenes: new Set([
    "id", "project_id", "name", "location", "time_period",
    "description", "lighting", "style", "prompt", "prohibited_elements",
    "prompt_front", "prompt_back", "prompt_overhead",
    "subject_image_url", "reference_url", "notes", "created_at",
  ]),
  shots: new Set([
    "id", "project_id", "shot_number", "duration", "scene_name",
    "characters", "visual", "camera", "dialogue", "sound",
    "image_prompt", "video_prompt", "refined_image_prompt", "refined_video_prompt",
    "status", "created_at",
  ]),
  projects: new Set([
    "id", "title", "type", "platform", "status", "description",
    "created_at", "updated_at",
  ]),
};

export async function getTableColumns(table) {
  const now = Date.now();
  if (_columnCache.has(table) && now - _cacheTime.get(table) < CACHE_TTL) {
    return _columnCache.get(table);
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.from(table).select("*").limit(1);

  if (error || !data || data.length === 0) {
    // Empty table — use fallback; will auto-discover once rows exist
    return FALLBACK_COLUMNS[table] || new Set();
  }

  const columns = new Set(Object.keys(data[0]));
  if (columns.size > 0) {
    _columnCache.set(table, columns);
    _cacheTime.set(table, now);
  }
  return columns;
}

// Strip unknown columns from a payload before insert/update
export async function safePayload(table, payload) {
  const columns = await getTableColumns(table);
  if (columns.size === 0) return payload;
  const clean = {};
  for (const [k, v] of Object.entries(payload)) {
    if (columns.has(k)) clean[k] = v;
  }
  return clean;
}
