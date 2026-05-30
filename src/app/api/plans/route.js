import { getServiceClient } from "@/lib/supabase";
import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) {
      return Response.json({ data: null, error: "缺少 project_id" });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      // Table might not exist — return null gracefully
      console.warn("[PLANS_API_WARN]", error.message);
      return Response.json({ data: null });
    }

    return Response.json({ data: data || null });
  } catch (err) {
    console.error("[PLANS_API_ERROR]", err.message);
    return Response.json({ data: null, error: err.message });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, project_id, request, current_plan } = body;

    if (action === "edit") {
      if (!request || !request.trim()) {
        return Response.json({ error: "请输入修改要求" }, { status: 400 });
      }

      const currentPlanStr = current_plan ? JSON.stringify(current_plan, null, 2) : "无现有策划案";
      const systemPrompt = "你是一个专业的AI视频策划助手。请根据修改要求输出完整的策划案JSON。";
      const userPrompt = `【当前策划案】\n${currentPlanStr}\n\n【修改要求】\n${request}\n\n请根据修改要求，输出修改后的策划案JSON。`;

      const content = await callDeepSeek(
        [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        { temperature: 0.7, maxTokens: 8192 }
      );

      let modifiedPlan;
      try { modifiedPlan = parseJsonResponse(content); }
      catch { return Response.json({ error: "AI输出格式异常" }, { status: 500 }); }

      return Response.json({ data: { plan: modifiedPlan } });
    }

    return Response.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    console.error("[PLANS_POST_ERROR]", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
