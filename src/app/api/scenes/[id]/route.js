import { getServiceClient } from "@/lib/supabase";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("scenes")
      .update(body)
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
    const { error } = await supabase
      .from("scenes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
