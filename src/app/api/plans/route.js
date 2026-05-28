import { getServiceClient } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");

    if (!projectId) {
      return Response.json({ error: "缺少 project_id" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) throw error;

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { project_id, ...planData } = body;

    if (!project_id) {
      return Response.json({ error: "缺少 project_id" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("plans")
      .select("id")
      .eq("project_id", project_id)
      .maybeSingle();

    let data;
    if (existing) {
      const result = await supabase
        .from("plans")
        .update(planData)
        .eq("project_id", project_id)
        .select()
        .single();
      if (result.error) throw result.error;
      data = result.data;
    } else {
      const result = await supabase
        .from("plans")
        .insert({ project_id, ...planData })
        .select()
        .single();
      if (result.error) throw result.error;
      data = result.data;
    }

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
