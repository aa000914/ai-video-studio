import { callDeepSeek } from "@/lib/deepseek";

export async function POST(req) {
  try {
    const { type, prompt: rawPrompt, style, shot } = await req.json();

    if (!rawPrompt || !rawPrompt.trim()) {
      return Response.json({ error: "请提供原始提示词" }, { status: 400 });
    }

    if (!type || !["image", "video"].includes(type)) {
      return Response.json({ error: "type 必须为 image 或 video" }, { status: 400 });
    }

    const shotContext = shot
      ? `\n当前分镜信息：\n- 镜头编号：${shot.shot_number || "—"}\n- 场景：${shot.scene_name || "—"}\n- 角色：${shot.characters || "—"}\n- 画面描述：${shot.visual || "—"}\n- 运镜：${shot.camera || "—"}`
      : "";

    const styleHint = style ? `\n画风要求：${style}` : "";

    const systemPrompt =
      type === "image"
        ? "你是一个专业的AI图片提示词工程师。请将用户提供的简短提示词润色成完整的英文图片生成提示词。严格按照：画风 + 景别 + 主体 + 动作 + 背景 + 光线 + 构图 + 画质要求 的结构输出。只输出润色后的英文提示词，不要任何解释。"
        : "你是一个专业的AI视频提示词工程师。请将用户提供的简短提示词润色成完整的英文视频生成提示词。严格按照：主体动作 + 镜头运动 + 情绪变化 + 节奏 + 时长 + 场景连贯性 + 画面稳定性 的结构输出。只输出润色后的英文提示词，不要任何解释。";

    const userPrompt = `请将以下提示词润色成专业的${type === "image" ? "图片" : "视频"}生成提示词。${styleHint}${shotContext}\n\n原始提示词：${rawPrompt}`;

    const content = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 2048 }
    );

    return Response.json({
      data: { polished: content.trim() },
      message: "润色完成",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
