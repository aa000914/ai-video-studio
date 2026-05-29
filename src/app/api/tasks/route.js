import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/tasks
 *
 * 列出所有 generation_tasks，按创建时间降序。
 *
 * Query:
 *   project_id: string (可选, 按项目过滤)
 *   type: string (可选, 按类型过滤: image / t2v / i2v / video_edit)
 *   status: string (可选, 按状态过滤)
 *   limit: number (可选, 默认 100)
 *
 * 返回:
 *   { data: [ ...generation_tasks ] }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const supabase = getServiceClient();

    let query = supabase
      .from("generation_tasks")
      .select("*");

    if (projectId) query = query.eq("project_id", projectId);
    if (type) query = query.eq("type", type);
    if (status) query = query.eq("status", status);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 500));

    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
