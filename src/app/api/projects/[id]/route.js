import { getServiceClient } from "@/lib/supabase";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return Response.json({ error: "项目不存在" }, { status: 404 });
    }
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, type, platform, status, description } = body;

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("projects")
      .update({ title, type, platform, status, description, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();

    // 级联删除关联数据：角色、场景、分镜
    await supabase.from("shots").delete().eq("project_id", id);
    await supabase.from("scenes").delete().eq("project_id", id);
    await supabase.from("characters").delete().eq("project_id", id);
    await supabase.from("ai_outputs").delete().eq("project_id", id);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
