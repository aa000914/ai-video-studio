import { getServiceClient } from "@/lib/supabase";
import { queryTask } from "@/lib/dashscope";

/**
 * GET /api/generation/status?id=xxx
 *
 * 查询任务状态。完成任务后自动保存资产到 generated_assets 并更新关联分镜。
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "缺少 id 参数" }, { status: 400 });

    const supabase = getServiceClient();
    const { data: task, error: taskError } = await supabase.from("generation_tasks").select("*").eq("id", id).single();
    if (taskError) return Response.json({ error: "任务不存在" }, { status: 404 });

    // Terminal state — return directly
    if (task.status === "succeeded" || task.status === "failed") {
      return Response.json({ success: task.status === "succeeded", status: task.status, resultUrl: task.result_url || null, error: task.error_message || null });
    }

    // No provider task_id — return current state
    if (!task.task_id) {
      return Response.json({ success: true, status: task.status, resultUrl: task.result_url || null, error: task.error_message || null });
    }

    // Query DashScope
    let dashResult;
    try { dashResult = await queryTask(task.task_id); }
    catch (queryErr) {
      return Response.json({ success: false, status: task.status, error: queryErr.message, resultUrl: task.result_url || null });
    }

    const { status: remoteStatus, resultUrl, error: dashError, raw: dashRaw } = dashResult;
    const mappedStatus = remoteStatus === "SUCCEEDED" ? "succeeded" : remoteStatus === "FAILED" ? "failed" : "running";

    if (mappedStatus === "running") {
      return Response.json({ success: true, status: "running", resultUrl: null, error: null });
    }

    if (mappedStatus === "succeeded" && resultUrl) {
      // Update task
      await supabase.from("generation_tasks").update({
        status: "succeeded", result_url: resultUrl, raw: dashRaw,
      }).eq("id", id);

      // Save asset
      const assetType = task.type === "image" ? "image" : "video";
      await supabase.from("generated_assets").insert({
        project_id: task.project_id, shot_id: task.shot_id, task_id: id,
        type: assetType, url: resultUrl, prompt: task.prompt, model: task.model, provider: task.provider || "dashscope",
      });

      // Update shot
      if (task.shot_id) {
        const isImage = task.type === "image";
        await supabase.from("shots").update({
          status: isImage ? "已生成图" : "已生成视频",
          [isImage ? "image_url" : "video_url"]: resultUrl,
        }).eq("id", task.shot_id);
      }

      return Response.json({ success: true, status: "succeeded", resultUrl, error: null });
    }

    if (mappedStatus === "succeeded" && !resultUrl) {
      // Succeeded but no URL
      await supabase.from("generation_tasks").update({ raw: dashRaw }).eq("id", id);
      return Response.json({ success: false, status: "succeeded", resultUrl: null, error: "未解析到资源链接" });
    }

    if (mappedStatus === "failed") {
      await supabase.from("generation_tasks").update({
        status: "failed", error_message: dashError || "生成失败", raw: dashRaw,
      }).eq("id", id);
      return Response.json({ success: false, status: "failed", error: dashError || "生成失败", resultUrl: null });
    }

    return Response.json({ success: true, status: "running", resultUrl: null, error: null });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
