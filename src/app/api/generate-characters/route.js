import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { script, projectId } = await req.json();

    if (!projectId) {
      return Response.json({ error: "缺少项目ID" }, { status: 400 });
    }

    const prompt = `你是一个AI视频角色设计师。请根据以下剧本内容，为视频制作设计详细角色资产。

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. 角色需要适合AI视频生成
4. prompt字段写英文，用于AI图片生成
5. 其他字段写中文

输出JSON结构：
{
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派/路人",
      "age": "年龄",
      "personality": "性格特征",
      "appearance": "外貌详细描述",
      "costume": "服装和配饰",
      "prompt": "英文AI生图提示词，包含外貌、服装、风格",
      "notes": "制作备注"
    }
  ]
}

${script ? `剧本内容：\n${script}` : "请根据常见AI短剧类型，生成3-5个通用角色。"}`;

    const content = await callDeepSeek([
      { role: "system", content: "你是一个专业的AI视频角色设计师。请严格按照要求的JSON格式输出。" },
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

    const characters = result.characters || [];
    if (characters.length === 0) {
      return Response.json({ data: [], message: "未能生成角色" });
    }

    const supabase = getServiceClient();
    const insertData = characters.map((c) => ({
      project_id: projectId,
      name: c.name || "未命名",
      role: c.role || "",
      age: c.age || "",
      personality: c.personality || "",
      appearance: c.appearance || "",
      costume: c.costume || "",
      prompt: c.prompt || "",
      notes: c.notes || "",
    }));

    const { data, error } = await supabase
      .from("characters")
      .insert(insertData)
      .select();

    if (error) throw error;

    return Response.json({ data, message: `成功生成 ${data.length} 个角色` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
