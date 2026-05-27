import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { script, projectId } = await req.json();

    if (!projectId) {
      return Response.json({ error: "缺少项目ID" }, { status: 400 });
    }

    const prompt = `你是一个AI视频场景设计师。请根据以下剧本内容，设计适合AI视频生成的场景资产。

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. 场景需要适合AI视频生成
4. prompt字段写英文，用于AI图片/视频生成
5. 其他字段写中文

输出JSON结构：
{
  "scenes": [
    {
      "name": "场景名称",
      "location": "地点",
      "time_period": "时间（白天/夜晚/清晨/黄昏等）",
      "description": "场景详细描述",
      "lighting": "灯光方案",
      "style": "视觉风格（写实/动漫/赛博朋克等）",
      "prompt": "英文AI生图/视频提示词",
      "notes": "制作备注"
    }
  ]
}

${script ? `剧本内容：\n${script}` : "请根据常见AI短剧类型，生成3-5个通用场景。"}`;

    const content = await callDeepSeek([
      { role: "system", content: "你是一个专业的AI视频场景设计师。请严格按照要求的JSON格式输出。" },
      { role: "user", content: prompt },
    ], { temperature: 0.7, maxTokens: 4096 });

    let result;
    try {
      result = parseJsonResponse(content);
    } catch {
      return Response.json({
        data: { raw: content, parseError: true },
        message: "JSON解析失败，请查看原始输出手动处理",
      });
    }

    const scenes = result.scenes || [];
    if (scenes.length === 0) {
      return Response.json({ data: [], message: "未能生成场景" });
    }

    const supabase = getServiceClient();
    const insertData = scenes.map((s) => ({
      project_id: projectId,
      name: s.name || "未命名",
      location: s.location || "",
      time_period: s.time_period || "",
      description: s.description || "",
      lighting: s.lighting || "",
      style: s.style || "",
      prompt: s.prompt || "",
      notes: s.notes || "",
    }));

    const { data, error } = await supabase
      .from("scenes")
      .insert(insertData)
      .select();

    if (error) throw error;

    return Response.json({ data, message: `成功生成 ${data.length} 个场景` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
