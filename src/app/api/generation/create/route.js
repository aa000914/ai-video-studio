import { getServiceClient } from "@/lib/supabase";
import {
  submitImageTask,
  submitTextToVideo,
  submitImageToVideo,
  submitVideoEdit,
} from "@/lib/dashscope";

/**
 * 将 duration 统一转为整数秒。
 * 支持 "5s" / "10s" / "5" / 5，默认 5，范围 2-15。
 */
function normalizeDuration(duration) {
  if (duration == null) return 5;
  const num = Number(String(duration).replace("s", ""));
  if (!Number.isInteger(num) || num < 2 || num > 15) return 5;
  return num;
}

/**
 * POST /api/generation/create
 *
 * Unified API to create a generation task (image, t2v, i2v, video_edit).
 * Saves to generation_tasks, submits to DashScope, returns task info.
 *
 * Body:
 *   projectId: string (必填)
 *   shotId: string (可选)
 *   type: "image" | "t2v" | "i2v" | "video_edit" (必填)
 *   prompt: string (必填)
 *   imageUrl: string (i2v 必填)
 *   model: string (可选, 默认使用环境变量)
 *   size: string (可选, image 用, 如 "1024*1024")
 *   duration: string (可选, 视频用, 如 "5s")
 *   resolution: string (可选, 视频用, 如 "720P")
 *   negative_prompt: string (可选)
 *   input_video_url: string (可选, video_edit 用)
 *
 * 返回:
 *   { success: true, generationTaskId: "uuid", dashscopeTaskId: "task_id", status: "pending" }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      projectId,
      shotId,
      type,
      prompt,
      imageUrl,
      model,
      size,
      duration,
      resolution,
      negative_prompt,
      input_video_url,
    } = body;

    // Validation
    if (!projectId) {
      return Response.json({ error: "缺少 projectId" }, { status: 400 });
    }
    if (!type || !["image", "t2v", "i2v", "video_edit"].includes(type)) {
      return Response.json({ error: "type 必须为 image / t2v / i2v / video_edit" }, { status: 400 });
    }
    if (!prompt?.trim()) {
      return Response.json({ error: "请输入提示词" }, { status: 400 });
    }

    // Resolve model based on type
    let resolvedModel = model;
    if (!resolvedModel) {
      switch (type) {
        case "image":
          resolvedModel = process.env.QWEN_IMAGE_MODEL || "wan2.7-image-pro";
          break;
        case "i2v":
          resolvedModel = process.env.WAN_I2V_MODEL || "wan2.7-i2v-2026-04-25";
          break;
        case "t2v":
          resolvedModel = process.env.WAN_T2V_MODEL || "wan2.7-t2v";
          break;
        case "video_edit":
          resolvedModel = process.env.WAN_VIDEO_EDIT_MODEL || "wan2.7-videoedit";
          break;
        default:
          resolvedModel = "wan2.7-image-pro";
      }
    }

    // Create initial DB record
    const supabase = getServiceClient();
    const { data: taskRecord, error: insertError } = await supabase
      .from("generation_tasks")
      .insert({
        project_id: projectId,
        shot_id: shotId || null,
        type,
        provider: "dashscope",
        model: resolvedModel,
        prompt: prompt.trim(),
        input_image_url: imageUrl || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`创建任务记录失败: ${insertError.message}`);
    }

    const taskUuid = taskRecord.id;

    // Update status to running
    await supabase
      .from("generation_tasks")
      .update({ status: "running" })
      .eq("id", taskUuid);

    // Submit to DashScope
    let dashscopeResult;
    try {
      switch (type) {
        case "image": {
          const dims = size ? size.split("*").map(Number) : [1024, 1024];
          dashscopeResult = await submitImageTask(prompt.trim(), {
            size: size || "1024*1024",
            n: 1,
            negative_prompt: negative_prompt || "",
            ref_image: imageUrl || "",
          });
          break;
        }

        case "t2v": {
          const numDuration = normalizeDuration(duration);
          dashscopeResult = await submitTextToVideo(prompt.trim(), {
            resolution: resolution || "720P",
            ratio: "16:9",
            duration: numDuration,
            negative_prompt,
          });
          break;
        }

        case "i2v": {
          if (!imageUrl) {
            throw new Error("图生视频需要先生成或提供分镜图 imageUrl");
          }
          dashscopeResult = await submitImageToVideo(imageUrl, prompt.trim(), {
            resolution: resolution || "720P",
            duration: normalizeDuration(duration),
          });
          break;
        }

        case "video_edit": {
          if (!input_video_url) {
            throw new Error("视频编辑需要提供 input_video_url");
          }
          const editType = model?.includes("happyhorse") ? "happyhorse-videoedit" : "videoedit";
          dashscopeResult = await submitVideoEdit(editType, input_video_url, prompt.trim());
          break;
        }

        default:
          throw new Error(`不支持的类型: ${type}`);
      }
    } catch (dashErr) {
      const errMsg = dashErr.message || "DashScope 调用失败";

      // Detect 403 / quota exhausted
      if (errMsg.includes("403") || errMsg.includes("AccessDenied") || errMsg.includes("Forbidden")) {
        await supabase
          .from("generation_tasks")
          .update({
            status: "failed",
            error_message: "免费额度已用完或免费额度用完即停已触发。",
          })
          .eq("id", taskUuid);

        return Response.json({
          success: false,
          error: "免费额度已用完或免费额度用完即停已触发。",
          generationTaskId: taskUuid,
          status: "failed",
        });
      }

      await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          error_message: errMsg,
        })
        .eq("id", taskUuid);

      return Response.json({
        success: false,
        error: errMsg,
        generationTaskId: taskUuid,
        status: "failed",
      });
    }

    // Handle sync image result (image model returns synchronously)
    if (type === "image" && dashscopeResult.status === "SUCCEEDED" && dashscopeResult.results?.length > 0) {
      const resultUrl = dashscopeResult.results[0].url;

      // Update task to succeeded
      await supabase
        .from("generation_tasks")
        .update({
          status: "succeeded",
          result_url: resultUrl,
        })
        .eq("id", taskUuid);

      // Write to generated_assets
      await supabase
        .from("generated_assets")
        .insert({
          project_id: projectId,
          shot_id: shotId || null,
          task_id: taskUuid,
          type: "image",
          url: resultUrl,
          prompt: prompt.trim(),
          model: resolvedModel,
        });

      return Response.json({
        success: true,
        generationTaskId: taskUuid,
        dashscopeTaskId: null,
        status: "succeeded",
        resultUrl,
      });
    }

    // Async mode: save task_id and return
    const dashscopeTaskId = dashscopeResult.task_id;

    await supabase
      .from("generation_tasks")
      .update({
        task_id: dashscopeTaskId,
      })
      .eq("id", taskUuid);

    return Response.json({
      success: true,
      generationTaskId: taskUuid,
      dashscopeTaskId,
      status: "running",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
