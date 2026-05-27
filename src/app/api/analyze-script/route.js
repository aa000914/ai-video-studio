import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { script, projectId } = await req.json();

    if (!script || !projectId) {
      return Response.json({ error: "缺少剧本内容或项目ID" }, { status: 400 });
    }

    const prompt = `你是一个专业的AI视频制作分析助手。请分析以下剧本/小说内容，输出结构化分析结果。

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. 所有字段都必须填写，没有的填"无"

输出JSON结构：
{
  "summary": "剧情摘要（200字以内）",
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派",
      "age": "年龄或年龄段",
      "personality": "性格描述",
      "appearance": "外貌描述",
      "costume": "服装建议"
    }
  ],
  "scenes": [
    {
      "name": "场景名",
      "location": "地点",
      "time_period": "时间段",
      "description": "场景描述"
    }
  ],
  "suggested_shots": 10,
  "difficulties": "制作难点分析",
  "shot_advice": "分镜建议"
}

剧本内容：
${script}`;

    const content = await callDeepSeek([
      { role: "system", content: "你是一个专业的AI视频制作分析助手。请严格按照要求的JSON格式输出，不要输出任何JSON之外的内容。" },
      { role: "user", content: prompt },
    ], { temperature: 0.3 });

    let analysis;
    try {
      analysis = parseJsonResponse(content);
    } catch {
      analysis = { raw: content, parseError: true };
    }

    const supabase = getServiceClient();
    const { error: dbError } = await supabase
      .from("ai_outputs")
      .insert({
        project_id: projectId,
        type: "script_analysis",
        input_text: script,
        output_text: JSON.stringify(analysis),
      });

    if (dbError) throw dbError;

    return Response.json({ data: analysis });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
