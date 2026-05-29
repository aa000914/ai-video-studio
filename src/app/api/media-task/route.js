import { queryTask } from "@/lib/dashscope";

/**
 * GET /api/media-task?task_id=xxx
 *
 * 查询 DashScope 异步任务状态。
 *
 * Query:
 *   task_id: string (必填)
 *
 * 返回:
 *   SUCCEEDED: { status: "SUCCEEDED", results: [{ url: "https://..." }] }
 *   RUNNING:   { status: "RUNNING", results: [] }
 *   FAILED:    { status: "FAILED", error: "错误信息" }
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return Response.json({ error: "缺少 task_id 参数" }, { status: 400 });
    }

    const result = await queryTask(taskId);

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
