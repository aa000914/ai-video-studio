import { getServiceClient } from "@/lib/supabase";
import { queryTask } from "@/lib/dashscope";

/**
 * GET /api/generation/status?id=xxx
 *
 * 查询 generation_tasks 状态。
 * 如果任务未完成，调用 DashScope 查询异步任务状态。
 * 如果成功，更新 DB 并写入 generated_assets。
 *
 * Query:
 *   id: string (generation_tasks 的 UUID)
 *
 * 返回:
 *   { success: true, status, resultUrl, error, raw }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "缺少 id 参数" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Query local DB first
    const { data: task, error: taskError } = await supabase
      .from("generation_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError) {
      return Response.json({ error: "任务不存在" }, { status: 404 });
    }

    // If already in terminal state, return directly
    if (task.status === "succeeded" || task.status === "failed") {
      return Response.json({
        success: true,
        status: task.status,
        resultUrl: task.result_url || null,
        error: task.error_message || null,
        raw: task.raw,
      });
    }

    // If no task_id from DashScope (pending or image sync), return current state
    if (!task.task_id) {
      return Response.json({
        success: true,
        status: task.status,
        resultUrl: task.result_url || null,
        error: task.error_message || null,
        raw: null,
      });
    }

    // Query DashScope for async task status
    let dashResult;
    try {
      dashResult = await queryTask(task.task_id);
    } catch (queryErr) {
      // 403 or network error — don't update DB, just return current state
      const errMsg = queryErr.message || "查询失败";
      return Response.json({
        success: false,
        status: task.status,
        error: errMsg,
        resultUrl: task.result_url || null,
        raw: null,
      });
    }

    // Update DB based on DashScope result
    if (dashResult.status === "SUCCEEDED") {
      const resultUrl = dashResult.results?.[0]?.url;

      if (resultUrl) {
        await supabase
          .from("generation_tasks")
          .update({
            status: "succeeded",
            result_url: resultUrl,
            raw: dashResult,
          })
          .eq("id", id);

        // Write to generated_assets
        await supabase
          .from("generated_assets")
          .insert({
            project_id: task.project_id,
            shot_id: task.shot_id,
            task_id: id,
            type: task.type,
            url: resultUrl,
            prompt: task.prompt,
            model: task.model,
          });

        // If this task has a shot, try to update shot status
        if (task.shot_id) {
          const statusField = task.type === "image" ? "已生成图" : "已生成视频";
          await supabase
            .from("shots")
            .update({ status: statusField, [task.type === "image" ? "image_url" : "video_url"]: resultUrl })
            .eq("id", task.shot_id);
        }

        return Response.json({
          success: true,
          status: "succeeded",
          resultUrl,
          error: null,
          raw: dashResult,
        });
      }

      // Succeeded but no URL
      await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          error_message: "生成成功但未返回资源 URL",
          raw: dashResult,
        })
        .eq("id", id);

      return Response.json({
        success: false,
        status: "failed",
        error: "生成成功但未返回资源 URL",
        resultUrl: null,
        raw: dashResult,
      });
    }

    if (dashResult.status === "FAILED") {
      const errMsg = dashResult.error || "生成失败";
      await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          error_message: errMsg,
          raw: dashResult,
        })
        .eq("id", id);

      return Response.json({
        success: false,
        status: "failed",
        error: errMsg,
        resultUrl: null,
        raw: dashResult,
      });
    }

    // Still running
    return Response.json({
      success: true,
      status: "running",
      resultUrl: null,
      error: null,
      raw: dashResult,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
