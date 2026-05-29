import { submitImageTask } from "@/lib/dashscope";

/**
 * POST /api/generate-image
 *
 * 提交文生图任务。
 * - 支持异步模式时返回 task_id 供前端轮询
 * - 不支持异步时自动使用同步模式，直接返回结果 URL
 *
 * Body:
 *   prompt: string (必填)
 *   size: string (可选, 默认 "1024*1024")
 *   n: number (可选, 默认 1)
 *   negative_prompt: string (可选)
 *
 * 返回 (异步):
 *   { task_id: string, status: "PENDING" }
 *
 * 返回 (同步):
 *   { status: "SUCCEEDED", results: [{ url: string }] }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, size = "1024*1024", n = 1, negative_prompt = "" } = body;

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: "请输入图片提示词" }, { status: 400 });
    }

    const result = await submitImageTask(prompt.trim(), {
      size,
      n: Math.min(Math.max(1, n), 4),
      negative_prompt,
    });

    // 同步模式：直接返回结果
    if (result.status === "SUCCEEDED" && result.results) {
      return Response.json(result);
    }

    // 异步模式：返回 task_id
    return Response.json({
      task_id: result.task_id,
      status: "PENDING",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
