import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient, safePayload } from "@/lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      prompt,
      content_type = "短剧漫剧",
      mode = "对话剧情",
      aspect_ratio = "9:16",
      storyboard_count = 12,
      art_style = "电影质感",
      episode_count = 1,
    } = body;

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: "请输入故事灵感或剧本内容" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Step 1: Create project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        title: prompt.trim().slice(0, 50),
        type: content_type,
        platform: aspect_ratio === "9:16" ? "抖音" : aspect_ratio === "16:9" ? "B站" : "视频号",
        status: "策划中",
        description: prompt.trim(),
      })
      .select()
      .single();

    if (projErr) throw projErr;
    const projectId = project.id;

    // Step 2: Generate everything with DeepSeek in one call
    const systemPrompt = `你是一个专业的AI视频制作工作台。请根据用户的灵感输入，生成完整的视频制作方案。

严格要求：
1. 只输出 JSON，不要任何 markdown 代码块包裹
2. 所有中文字段用中文，prompt 类字段用英文
3. image_prompt 和 video_prompt 必须是高质量英文提示词
4. image_prompt 结构：画风 + 景别 + 主体动作 + 背景环境 + 光线氛围 + 镜头语言
5. video_prompt 结构：在 image_prompt 基础上增加运动描述（camera movement, subject motion）
6. 角色必须包含 consistency_prompt（角色一致性提示词）和 prohibited_changes（禁止变化点）
7. 场景必须包含 prompt（场景提示词）和 prohibited_elements（禁止元素）
8. 生成 ${storyboard_count} 个分镜`;

    const userPrompt = `请根据以下信息，生成完整的视频制作方案JSON：

【内容类型】${content_type}
【创作模式】${mode}
【画面比例】${aspect_ratio}
【分镜数量】${storyboard_count}
【剧集】${episode_count === 1 ? "单集" : "多集"}
【画风要求】${art_style}

【灵感内容】
${prompt}

请输出以下JSON结构：
{
  "plan": {
    "summary": "策划摘要（200字以内）",
    "art_style": "${art_style}",
    "content_type": "${content_type}",
    "mode": "${mode}",
    "aspect_ratio": "${aspect_ratio}",
    "episode_count": ${episode_count},
    "storyboard_count": ${storyboard_count},
    "music_style": "建议的音乐风格",
    "narration_style": "建议的旁白风格（如为对话剧情模式则填'以角色对白为主'）",
    "script_text": "基于灵感扩展的完整剧本（300-500字）"
  },
  "suggested_title": "建议的项目标题（15字以内）",
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派",
      "age": "年龄段",
      "personality": "性格",
      "appearance": "外貌描述",
      "costume": "服装描述",
      "prompt": "角色一致性提示词（英文，用于保持后续分镜中角色一致性）",
      "prohibited_changes": "禁止变化点（中文，列出不可改变的特征）",
      "notes": "补充说明"
    }
  ],
  "scenes": [
    {
      "name": "场景名",
      "location": "地点",
      "time_period": "时代",
      "description": "空间描述",
      "lighting": "光线方案",
      "style": "风格",
      "prompt": "场景提示词（英文）",
      "prohibited_elements": "禁止元素（中文，列出不应出现的元素）",
      "prompt_front": "主视图提示词（英文）",
      "prompt_back": "反打视图提示词（英文）",
      "prompt_overhead": "俯视图提示词（英文）",
      "notes": "补充说明"
    }
  ],
  "shots": [
    {
      "shot_number": 1,
      "duration": "5秒",
      "scene_name": "对应的场景名",
      "characters": "出场角色",
      "visual": "画面描述",
      "camera": "镜头运动",
      "dialogue": "台词或旁白",
      "sound": "音效配乐",
      "image_prompt": "图片提示词（英文，结构：画风+景别+主体动作+背景环境+光线氛围+镜头语言）",
      "video_prompt": "视频提示词（英文，在image_prompt基础上增加运动描述）",
      "status": "待生成"
    }
  ]
}`;

    let result;
    try {
      const content = await callDeepSeek(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.7, maxTokens: 16384 }
      );
      result = parseJsonResponse(content);
    } catch (e) {
      // JSON parse failed — return raw text for debugging
      let rawText = "";
      try {
        rawText = await callDeepSeek(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          { temperature: 0.7, maxTokens: 16384 }
        );
      } catch {
        rawText = e.message;
      }
      return Response.json({
        data: {
          project,
          plan: null,
          characters: [],
          scenes: [],
          shots: [],
          parseError: true,
          raw: rawText,
        },
        error: "AI输出格式异常，请重试",
      });
    }

    // Step 3: Update project title
    if (result.suggested_title) {
      await supabase
        .from("projects")
        .update({ title: result.suggested_title })
        .eq("id", projectId);
      project.title = result.suggested_title;
    }

    // Step 4: Save plan
    let savedPlan = null;
    if (result.plan) {
      const planPayload = await safePayload("plans", {
        project_id: projectId,
        ...result.plan,
      });
      const { data: planData } = await supabase
        .from("plans")
        .insert(planPayload)
        .select()
        .single();
      savedPlan = planData || null;
    }

    // Step 5: Save characters
    const characters = result.characters || [];
    let savedCharacters = [];
    if (characters.length > 0) {
      const charPayloads = await Promise.all(
        characters.map(async (c) =>
          safePayload("characters", {
            project_id: projectId,
            name: c.name || "未命名",
            role: c.role || "",
            age: c.age || "",
            personality: c.personality || "",
            appearance: c.appearance || "",
            costume: c.costume || "",
            prompt: c.prompt || "",
            prohibited_changes: c.prohibited_changes || "",
            prompt_front: c.prompt_front || "",
            prompt_back: c.prompt_back || "",
            prompt_overhead: c.prompt_overhead || "",
            notes: c.notes || "",
          })
        )
      );
      const { data: chars } = await supabase
        .from("characters")
        .insert(charPayloads)
        .select();
      savedCharacters = chars || [];
    }

    // Step 6: Save scenes
    const scenes = result.scenes || [];
    let savedScenes = [];
    if (scenes.length > 0) {
      const scenePayloads = await Promise.all(
        scenes.map(async (s) =>
          safePayload("scenes", {
            project_id: projectId,
            name: s.name || "未命名",
            location: s.location || "",
            time_period: s.time_period || "",
            description: s.description || "",
            lighting: s.lighting || "",
            style: s.style || "",
            prompt: s.prompt || "",
            prohibited_elements: s.prohibited_elements || "",
            prompt_front: s.prompt_front || "",
            prompt_back: s.prompt_back || "",
            prompt_overhead: s.prompt_overhead || "",
            notes: s.notes || "",
          })
        )
      );
      const { data: scs } = await supabase
        .from("scenes")
        .insert(scenePayloads)
        .select();
      savedScenes = scs || [];
    }

    // Step 7: Save shots
    const shots = result.shots || [];
    let savedShots = [];
    if (shots.length > 0) {
      const shotPayloads = shots.map((s) => ({
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
        status: s.status || "待生成",
      }));
      const { data: sts } = await supabase
        .from("shots")
        .insert(shotPayloads)
        .select();
      savedShots = sts || [];
    }

    return Response.json({
      data: {
        project: { ...project, id: projectId },
        plan: savedPlan,
        characters: savedCharacters,
        scenes: savedScenes,
        shots: savedShots,
      },
      message: `自动生成完成！项目「${project.title}」已创建：1个策划案、${savedCharacters.length}个角色、${savedScenes.length}个场景、${savedShots.length}个分镜。`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
