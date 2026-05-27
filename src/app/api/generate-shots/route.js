import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { script, projectId } = await req.json();

    if (!projectId) {
      return Response.json({ error: "缺少项目ID" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: characters } = await supabase
      .from("characters")
      .select("name, role")
      .eq("project_id", projectId);

    const { data: scenes } = await supabase
      .from("scenes")
      .select("name, description")
      .eq("project_id", projectId);

    const charContext = characters?.length
      ? characters.map((c) => `${c.name}(${c.role})`).join("、")
      : "无";

    const sceneContext = scenes?.length
      ? scenes.map((s) => s.name).join("、")
      : "无";

    const prompt = `你是一个专业的AI视频分镜师。请根据以下信息，生成10-20个详细分镜。

项目角色：${charContext}
可用场景：${sceneContext}

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. image_prompt和video_prompt写英文，用于AI生成
4. 其他字段写中文
5. shot_number从1开始递增
6. duration建议3-8秒

输出JSON结构：
{
  "shots": [
    {
      "shot_number": 1,
      "duration": "5秒",
      "scene_name": "场景名",
      "characters": "出现的角色",
      "visual": "画面描述",
      "camera": "镜头运动（固定/推/拉/摇/跟/俯拍/仰拍）",
      "dialogue": "对白或旁白",
      "sound": "音效和配乐",
      "image_prompt": "英文AI生图提示词，包含构图、光线、风格",
      "video_prompt": "英文AI视频提示词，包含运动、转场、特效"
    }
  ]
}

${script ? `剧本内容：\n${script}` : "请根据角色和场景信息，创作10-15个精彩分镜。"}`;

    const content = await callDeepSeek([
      { role: "system", content: "你是一个专业的AI视频分镜师。请严格按照要求的JSON格式输出。" },
      { role: "user", content: prompt },
    ], { temperature: 0.7, maxTokens: 8192 });

    let result;
    try {
      result = parseJsonResponse(content);
    } catch {
      return Response.json({
        data: { raw: content, parseError: true },
        message: "JSON解析失败，请查看原始输出手动处理",
      });
    }

    const shots = result.shots || [];
    if (shots.length === 0) {
      return Response.json({ data: [], message: "未能生成分镜" });
    }

    const insertData = shots.map((s) => ({
      project_id: projectId,
      shot_number: s.shot_number || 0,
      duration: s.duration || "",
      scene_name: s.scene_name || "",
      characters: s.characters || "",
      visual: s.visual || "",
      camera: s.camera || "",
      dialogue: s.dialogue || "",
      sound: s.sound || "",
      image_prompt: s.image_prompt || "",
      video_prompt: s.video_prompt || "",
      status: "待生成",
    }));

    const { data, error } = await supabase
      .from("shots")
      .insert(insertData)
      .select();

    if (error) throw error;

    return Response.json({ data, message: `成功生成 ${data.length} 个分镜` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
