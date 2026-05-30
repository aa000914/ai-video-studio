import { getServiceClient } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) return Response.json({ error: "缺少 project_id" }, { status: 400 });

    const supabase = getServiceClient();
    const { data, error } = await supabase.from("plan_versions").select("*").eq("project_id", projectId).order("version", { ascending: false });
    if (error) throw error;
    return Response.json({ data: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { project_id, summary, style, subjects_snapshot, scenes_snapshot, shot_script_snapshot, source_prompt } = body;
    if (!project_id) return Response.json({ error: "缺少 project_id" }, { status: 400 });

    const supabase = getServiceClient();
    // Get next version number
    const { data: last } = await supabase.from("plan_versions").select("version").eq("project_id", project_id).order("version", { ascending: false }).limit(1).single();
    const nextVersion = (last?.version || 0) + 1;

    const { data, error } = await supabase.from("plan_versions").insert({
      project_id, version: nextVersion, summary, style, subjects_snapshot, scenes_snapshot, shot_script_snapshot, source_prompt,
    }).select().single();
    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
