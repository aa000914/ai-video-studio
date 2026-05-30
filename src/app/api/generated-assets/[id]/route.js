import { getServiceClient, safePayload } from "@/lib/supabase";

/**
 * GET /api/generated-assets/[id]
 * PUT /api/generated-assets/[id]  — 更新 is_selected 等字段
 * DELETE /api/generated-assets/[id]
 */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServiceClient();
    const clean = await safePayload("generated_assets", body);
    const { data, error } = await supabase.from("generated_assets").update(clean).eq("id", id).select().single();
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
    const { error } = await supabase.from("generated_assets").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
