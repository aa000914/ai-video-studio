import { getServiceClient, safePayload } from "@/lib/supabase";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServiceClient();
    const clean = await safePayload("characters", body);
    const { data, error } = await supabase
      .from("characters").update(clean).eq("id", id).select().single();

    if (error) {
      console.error("[CHARACTERS_PUT_ERROR]", id, error.message);
      throw error;
    }
    console.log("[CHARACTERS_PUT_OK]", id, Object.keys(clean).join(","));
    return Response.json({ data });
  } catch (err) {
    console.error("[CHARACTERS_PUT_FAILED]", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const supabase = getServiceClient();
    const { error } = await supabase.from("characters").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
