import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/generated-assets?project_id=xxx&type=image
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const type = searchParams.get("type");

    if (!projectId) return Response.json({ error: "缺少 project_id" }, { status: 400 });

    const supabase = getServiceClient();
    let query = supabase.from("generated_assets").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(500);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
