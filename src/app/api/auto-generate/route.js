import { callDeepSeek, parseJsonResponse } from "@/lib/deepseek";
import { getServiceClient, safePayload } from "@/lib/supabase";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: "请输入剧本或灵感描述" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const steps = [];

    // Step 1: Create project from prompt
    steps.push({ step: "create_project", status: "running" });

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        title: prompt.trim().slice(0, 50),
        type: "AI短剧",
        platform: "抖音",
        status: "策划中",
        description: prompt.trim(),
      })
      .select()
      .single();

    if (projErr) throw projErr;
    steps[0].status = "done";

    const projectId = project.id;

    // Step 2: Analyze script with DeepSeek
    steps.push({ step: "analyze_script", status: "running" });

    const analyzePrompt = `你是一个专业的AI视频制作分析助手。请分析以下剧本/灵感内容，输出结构化分析结果。

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. 所有字段都必须填写

输出JSON结构：
{
  "summary": "剧情摘要（200字以内）",
  "suggested_title": "建议的项目标题（15字以内）",
  "suggested_type": "建议类型（AI短剧/文博视频/广告片/小说推文/知识科普）",
  "suggested_platform": "建议平台（抖音/小红书/视频号/B站）",
  "characters": [
    {
      "name": "角色名",
      "role": "主角/配角/反派",
      "age": "年龄或年龄段",
      "personality": "性格描述",
      "appearance": "外貌描述",
      "costume": "服装建议",
      "prompt": "英文AI生图提示词",
      "prohibited_changes": "禁止变化点（角色中不可改变的特征）",
      "notes": "备注"
    }
  ],
  "scenes": [
    {
      "name": "场景名",
      "location": "地点",
      "time_period": "时间段",
      "description": "空间描述",
      "lighting": "光线方案",
      "style": "风格",
      "prompt": "英文AI生图提示词",
      "prohibited_elements": "禁止出现的元素",
      "notes": "备注"
    }
  ],
  "suggested_shots": 10,
  "shot_advice": "分镜建议（100字以内）"
}

剧本/灵感内容：
${prompt}`;

    let analysis;
    try {
      const content = await callDeepSeek(
        [
          {
            role: "system",
            content:
              "你是一个专业的AI视频制作分析助手。请严格按照要求的JSON格式输出，不要输出任何JSON之外的内容。所有中文字段使用中文，prompt字段使用英文。",
          },
          { role: "user", content: analyzePrompt },
        ],
        { temperature: 0.3 }
      );
      analysis = parseJsonResponse(content);
    } catch (e) {
      analysis = { parseError: true, raw: e.message };
    }

    steps[1].status = "done";

    if (analysis.parseError) {
      return Response.json({
        data: {
          project,
          steps,
          error: "剧本分析失败，请重试",
        },
      });
    }

    // Update project title if AI suggested a better one
    if (analysis.suggested_title) {
      await supabase
        .from("projects")
        .update({ title: analysis.suggested_title })
        .eq("id", projectId);
      project.title = analysis.suggested_title;
    }

    // Step 3: Save characters
    steps.push({ step: "generate_characters", status: "running" });

    const characters = analysis.characters || [];
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
    steps[2].status = "done";
    steps[2].count = savedCharacters.length;

    // Step 4: Save scenes
    steps.push({ step: "generate_scenes", status: "running" });

    const scenes = analysis.scenes || [];
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
    steps[3].status = "done";
    steps[3].count = savedScenes.length;

    // Step 5: Generate shots
    steps.push({ step: "generate_shots", status: "running" });

    const charContext =
      savedCharacters.length > 0
        ? savedCharacters.map((c) => `${c.name}(${c.role})`).join("、")
        : "无";

    const sceneContext =
      savedScenes.length > 0
        ? savedScenes.map((s) => s.name).join("、")
        : "无";

    const shotPrompt = `你是一个专业的AI视频分镜师。请根据以下信息，生成10-15个详细分镜。

项目角色：${charContext}
可用场景：${sceneContext}

要求：
1. 输出严格的JSON格式
2. 不要使用markdown代码块包裹
3. image_prompt和video_prompt写英文
4. 其他字段写中文
5. shot_number从1开始递增
6. duration建议3-8秒

输出JSON结构：
{
  "shots": [
    {
      "shot_number": 1,
      "duration": "5秒",
      "scene_name": "场景名（必须是上面列出的场景之一）",
      "characters": "出现的角色",
      "visual": "画面描述",
      "camera": "镜头运动",
      "dialogue": "对白或旁白",
      "sound": "音效和配乐",
      "image_prompt": "英文AI生图提示词",
      "video_prompt": "英文AI视频提示词"
    }
  ]
}

剧本内容：
${prompt}`;

    let savedShots = [];
    try {
      const shotContent = await callDeepSeek(
        [
          {
            role: "system",
            content:
              "你是一个专业的AI视频分镜师。请严格按照要求的JSON格式输出。",
          },
          { role: "user", content: shotPrompt },
        ],
        { temperature: 0.7, maxTokens: 8192 }
      );

      const shotResult = parseJsonResponse(shotContent);
      const shots = shotResult.shots || [];

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
          status: "待生成",
        }));

        const { data: sts } = await supabase
          .from("shots")
          .insert(shotPayloads)
          .select();
        savedShots = sts || [];
      }
    } catch (e) {
      steps[4].error = e.message;
    }
    steps[4].status = "done";
    steps[4].count = savedShots.length;

    return Response.json({
      data: {
        project: { ...project, id: projectId },
        characters: savedCharacters,
        scenes: savedScenes,
        shots: savedShots,
        steps,
      },
      message: `自动生成完成！项目「${project.title}」已创建，包含 ${savedCharacters.length} 个角色、${savedScenes.length} 个场景、${savedShots.length} 个分镜。`,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
