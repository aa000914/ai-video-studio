import { getServiceClient } from "@/lib/supabase";
import HomePageClient from "@/components/HomePage";

export default async function HomePage() {
  let projects = [];
  let error = "";

  try {
    const supabase = getServiceClient();
    const { data, error: dbError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;
    projects = data || [];
  } catch (err) {
    error = err.message || "数据加载失败";
  }

  return <HomePageClient initialProjects={projects} initialError={error} />;
}
