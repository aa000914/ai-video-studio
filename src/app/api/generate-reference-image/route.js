import { getServiceClient } from "@/lib/supabase";
import { submitImageTask } from "@/lib/dashscope";

/**
 * POST /api/generate-reference-image
 *
 * 专用于人物/场景参考图生成。服务端全流程：
 * 1. 调用 Qwen Image 生图
 * 2. 拿到 imageUrl 后直接 update characters/scenes.subject_image_url
 * 3. insert generated_assets with metadata
 * 4. 返回 imageUrl
 *
 * Body:
 *   project_id: string
 *   entity_type: "character" | "scene"
 *   entity_id: string
 *   entity_name: string
 *   prompt_cn: string (中文提示词)
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { project_id, entity_type, entity_id, entity_name, prompt_cn } = body;

    if (!project_id || !entity_type || !entity_id || !entity_name) {
      return Response.json({ ok: false, error: "缺少必要参数" }, { status: 400 });
    }
    if (!["character", "scene"].includes(entity_type)) {
      return Response.json({ ok: false, error: "entity_type 必须为 character 或 scene" }, { status: 400 });
    }
    if (!prompt_cn?.trim()) {
      return Response.json({ ok: false, error: "缺少中文生图提示词" }, { status: 400 });
    }

    console.log("[REF_IMAGE_REQUEST]", { project_id, entity_type, entity_id, entity_name });

    // 1. Call Qwen Image
    const result = await submitImageTask(prompt_cn.trim(), {
      size: entity_type === "character" ? "1024*1024" : "1280*720",
      n: 1,
    });

    if (!result || result.status === "FAILED") {
      console.error("[REF_IMAGE_ERROR]", "DashScope returned FAILED");
      return Response.json({ ok: false, error: "生图失败" }, { status: 500 });
    }

    // Async: only got task_id
    if (result.task_id && !result.results) {
      console.log("[REF_IMAGE_PENDING]", result.task_id);
      return Response.json({ ok: true, pending: true, taskId: result.task_id, entity_type, entity_id });
    }

    // Sync: got image URL
    const imageUrl = result.results?.[0]?.url;
    if (!imageUrl) {
      console.error("[REF_IMAGE_ERROR]", "No image URL in result");
      return Response.json({ ok: false, error: "未获取到图片链接" }, { status: 500 });
    }

    console.log("[REF_IMAGE_GENERATED]", imageUrl.slice(0, 80));

    // 2. Update character/scene subject_image_url
    const supabase = getServiceClient();
    const table = entity_type === "character" ? "characters" : "scenes";

    const { error: updateErr } = await supabase
      .from(table)
      .update({ subject_image_url: imageUrl })
      .eq("id", entity_id);

    if (updateErr) {
      console.error("[REF_IMAGE_UPDATE_FAILED]", table, entity_id, updateErr.message);
    } else {
      console.log("[REF_IMAGE_UPDATE_" + (entity_type === "character" ? "CHARACTER" : "SCENE") + "_OK]", entity_id);
    }

    // 3. Insert generated_assets
    const { data: assetData, error: insertErr } = await supabase
      .from("generated_assets")
      .insert({
        project_id,
        type: "image",
        url: imageUrl,
        prompt: prompt_cn.trim(),
        model: process.env.QWEN_IMAGE_MODEL || "qwen-image-2.0-pro",
        provider: "dashscope",
        metadata: {
          target_type: entity_type,
          target_id: entity_id,
          target_name: entity_name,
          prompt_cn: prompt_cn.trim(),
          source: "creation_document",
        },
        is_selected: false,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[REF_IMAGE_ASSET_INSERT_FAILED]", insertErr.message);
    } else {
      console.log("[REF_IMAGE_ASSET_INSERT_OK]", assetData?.id);
    }

    return Response.json({
      ok: true,
      imageUrl,
      entity_type,
      entity_id,
      assetId: assetData?.id,
    });
  } catch (err) {
    console.error("[REF_IMAGE_ERROR]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
