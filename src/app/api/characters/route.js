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
      .from("characters")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("[CHARACTERS_GET]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const supabase = getServiceClient();

    // Ensure metadata is preserved as-is (safePayload will include it)
    const clean = await safePayload("characters", body);
    const { data, error } = await supabase
      .from("characters")
      .insert(clean)
      .select()
      .single();

    if (error) throw error;
    console.log("[CHARACTERS_POST_OK]", data.id, data.name);
    return Response.json({ ok: true, data }, { status: 201 });
  } catch (err) {
    console.error("[CHARACTERS_POST]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
