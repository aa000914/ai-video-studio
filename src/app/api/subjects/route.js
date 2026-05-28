import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getServiceClient();

    const [charRes, sceneRes] = await Promise.all([
      supabase
        .from("characters")
        .select("*, projects(title)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("scenes")
        .select("*, projects(title)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return Response.json({
      data: {
        characters: charRes.data || [],
        scenes: sceneRes.data || [],
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
