import { getServiceClient, safePayload } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return Response.json({ ok: false, error: "缺少project_id" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("[SCENES_GET]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = getServiceClient();
    const clean = await safePayload("scenes", body);
    const { data, error } = await supabase
      .from("scenes")
      .insert(clean)
      .select()
      .single();

    if (error) throw error;
    console.log("[SCENES_POST_OK]", data.id, data.name);
    return Response.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    console.error("[SCENES_POST]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
