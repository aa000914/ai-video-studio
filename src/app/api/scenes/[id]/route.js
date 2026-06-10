import { getServiceClient, safePayload } from "@/lib/supabase";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServiceClient();
    const clean = await safePayload("scenes", body);
    const { data, error } = await supabase
      .from("scenes").update(clean).eq("id", id).select().single();

    if (error) {
      console.error("[SCENES_PUT_ERROR]", id, error.message);
      throw error;
    }
    console.log("[SCENES_PUT_OK]", id, Object.keys(clean).join(","));
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("[SCENES_PUT_FAILED]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const { error } = await supabase.from("scenes").delete().eq("id", id);
    if (error) throw error;
    console.log("[SCENES_DELETE_OK]", id);
    return Response.json({ ok: true, data: { id } });
  } catch (err) {
    console.error("[SCENES_DELETE]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
