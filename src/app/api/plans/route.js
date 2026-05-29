import { getServiceClient } from "@/lib/supabase";
import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";

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

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, project_id, request, current_plan } = body;

    if (action === "edit") {
      // 对话修改策划案
      if (!request || !request.trim()) {
        return Response.json({ error: "请输入修改要求" }, { status: 400 });
      }

      const currentPlanStr = current_plan ? JSON.stringify(current_plan, null, 2) : "无现有策划案";

      const systemPrompt = `你是一个专业的AI视频策划助手。用户会给你当前的策划案和修改要求，你需要根据要求修改策划案。

严格要求：
1. 只输出修改后的完整策划案 JSON，不要任何 markdown 代码块包裹
2. 保持所有字段完整
3. 仅在用户要求的范围内修改，不要随意改变其他内容

输出JSON结构：
{
  "summary": "策划摘要",
  "art_style": "美术风格",
  "content_type": "内容类型",
  "mode": "创作模式",
  "aspect_ratio": "画面比例",
  "episode_count": 1,
  "storyboard_count": 12,
  "music_style": "音乐风格",
  "narration_style": "旁白风格",
  "script_text": "剧本内容"
}`;

      const userPrompt = `【当前策划案】\n${currentPlanStr}\n\n【修改要求】\n${request}\n\n请根据修改要求，输出修改后的策划案JSON。`;

      const content = await callDeepSeek(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.7, maxTokens: 8192 }
      );

      let modifiedPlan;
      try {
        modifiedPlan = parseJsonResponse(content);
      } catch {
        return Response.json({ error: "AI输出格式异常，请重试" }, { status: 500 });
      }

      return Response.json({ data: { plan: modifiedPlan } });
    }

    return Response.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
