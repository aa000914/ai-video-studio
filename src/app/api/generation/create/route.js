import { getServiceClient } from "@/lib/supabase";
import {
  submitImageTask,
  submitTextToVideo,
  submitImageToVideo,
  submitVideoEdit,
} from "@/lib/dashscope";

function normalizeDuration(duration) {
  if (duration == null) return 5;
  const num = Number(String(duration).replace("s", ""));
  if (!Number.isInteger(num) || num < 2 || num > 15) return 5;
  return num;
}

/**
 * POST /api/generation/create
 *
 * 统一创建生成任务：
 *   DB insert → call DashScope → update status → save asset → update shot
 *
 * Body:
 *   projectId: string (必填)
 *   shotId:    string (可选, 关联分镜)
 *   type:      "image" | "t2v" | "i2v" | "video_edit" (必填)
 *   prompt:    string (必填)
 *   imageUrl:  string (i2v 必填)
 *   model:     string (可选)
 *   size:      string (可选, "1024*1024")
 *   duration:  string (可选, "5s")
 *   resolution:string (可选, "720P")
 *   negative_prompt: string (可选)
 *   input_video_url: string (可选)
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { projectId, shotId, type, prompt, imageUrl, model, size, duration, resolution, negative_prompt, input_video_url } = body;

    if (!projectId) return Response.json({ error: "缺少 projectId" }, { status: 400 });
    if (!type || !["image", "t2v", "i2v", "video_edit"].includes(type)) {
      return Response.json({ error: "type 必须为 image / t2v / i2v / video_edit" }, { status: 400 });
    }
    if (!prompt?.trim() && type !== "i2v") return Response.json({ error: "请输入提示词" }, { status: 400 });

    let resolvedModel = model;
    if (!resolvedModel) {
      switch (type) {
        case "image":  resolvedModel = process.env.QWEN_IMAGE_MODEL || "wan2.7-image-pro"; break;
        case "i2v":    resolvedModel = process.env.HAPPYHORSE_VIDEO_MODEL || process.env.WAN_I2V_MODEL || "happyhorse-1.0-video"; break;
        case "t2v":    resolvedModel = process.env.HAPPYHORSE_VIDEO_MODEL || process.env.WAN_T2V_MODEL || "happyhorse-1.0-video"; break;
        case "video_edit": resolvedModel = process.env.WAN_VIDEO_EDIT_MODEL || "wan2.7-videoedit"; break;
        default:       resolvedModel = "wan2.7-image-pro";
      }
    }

    const supabase = getServiceClient();

    // 1. Create task record
    const { data: taskRecord, error: insertError } = await supabase
      .from("generation_tasks")
      .insert({
        project_id: projectId, shot_id: shotId || null,
        type, provider: "dashscope", model: resolvedModel,
        prompt: prompt?.trim() || "", input_image_url: imageUrl || null,
        status: "pending",
      })
      .select().single();
    if (insertError) throw new Error(`创建任务失败: ${insertError.message}`);

    const taskUuid = taskRecord.id;

    // Update to running
    await supabase.from("generation_tasks").update({ status: "running" }).eq("id", taskUuid);

    // 2. Call DashScope
    let result;
    try {
      switch (type) {
        case "image":
          result = await submitImageTask(prompt.trim(), { size: size || "1024*1024", n: 1, negative_prompt: negative_prompt || "", ref_image: imageUrl || "" });
          break;
        case "t2v":
          result = await submitTextToVideo(prompt.trim(), { model: resolvedModel, resolution: resolution || "720P", ratio: "16:9", duration: normalizeDuration(duration), negative_prompt });
          break;
        case "i2v":
          if (!imageUrl) throw new Error("图生视频需要 imageUrl");
          result = await submitImageToVideo(imageUrl, prompt?.trim() || "Generate video from this image", { model: resolvedModel, resolution: resolution || "720P", duration: normalizeDuration(duration) });
          break;
        case "video_edit":
          if (!input_video_url) throw new Error("视频编辑需要 input_video_url");
          result = await submitVideoEdit(model?.includes("happyhorse") ? "happyhorse-videoedit" : "videoedit", input_video_url, prompt.trim());
          break;
        default: throw new Error(`不支持的类型: ${type}`);
      }
    } catch (dashErr) {
      const errMsg = dashErr.message || "DashScope 调用失败";
      const isQuota = errMsg.includes("403") || errMsg.includes("AccessDenied") || errMsg.includes("Forbidden");
      await supabase.from("generation_tasks").update({
        status: "failed", error_message: isQuota ? "免费额度已用完" : errMsg,
      }).eq("id", taskUuid);
      return Response.json({ success: false, error: isQuota ? "免费额度已用完" : errMsg, generationTaskId: taskUuid, status: "failed" });
    }

    // 3. Handle sync result (image)
    if (type === "image" && result.status === "SUCCEEDED" && result.results?.length > 0) {
      const resultUrl = result.results[0].url;
      await supabase.from("generation_tasks").update({ status: "succeeded", result_url: resultUrl }).eq("id", taskUuid);

      // Save asset
      await supabase.from("generated_assets").insert({
        project_id: projectId, shot_id: shotId || null, task_id: taskUuid,
        type: "image", url: resultUrl, prompt: prompt.trim(), model: resolvedModel, provider: "dashscope",
      });

      // Update shot
      if (shotId) {
        await supabase.from("shots").update({ status: "已生成图", image_url: resultUrl }).eq("id", shotId);
      }

      return Response.json({ success: true, generationTaskId: taskUuid, status: "succeeded", resultUrl });
    }

    // 4. Async: save task_id
    const dashscopeTaskId = result.task_id;
    await supabase.from("generation_tasks").update({ task_id: dashscopeTaskId }).eq("id", taskUuid);

    return Response.json({ success: true, generationTaskId: taskUuid, status: "running" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
