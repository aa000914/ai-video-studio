import { getServiceClient } from "@/lib/supabase";
import ProjectListClient from "./ProjectListClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
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

  return <ProjectListClient initialProjects={projects} initialError={error} />;
}
