import {
  submitImageToVideo,
  submitTextToVideo,
  submitVideoEdit,
} from "@/lib/dashscope";

/**
 * POST /api/generate-video
 *
 * 提交视频生成任务（异步），返回 task_id 供前端轮询。
 *
 * Body (文生视频):
 *   type: "t2v"
 *   prompt: string (必填)
 *   negative_prompt: string (可选)
 *
 * Body (图生视频):
 *   type: "i2v"
 *   image_url: string (必填)
 *   prompt: string (必填)
 *   negative_prompt: string (可选)
 *
 * Body (视频编辑):
 *   type: "videoedit" | "happyhorse-videoedit"
 *   video_url: string (必填)
 *   prompt: string (必填)
 *
 * 返回:
 *   { task_id: string, status: "PENDING" }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { type } = body;

    if (!type) {
      return Response.json({ error: "缺少 type 参数 (t2v / i2v / videoedit / happyhorse-videoedit)" }, { status: 400 });
    }

    let result;

    switch (type) {
      case "t2v": {
        const { prompt, negative_prompt } = body;
        if (!prompt?.trim()) return Response.json({ error: "请输入视频提示词" }, { status: 400 });
        result = await submitTextToVideo(prompt.trim(), { negative_prompt });
        break;
      }

      case "i2v": {
        const { image_url, prompt, negative_prompt } = body;
        if (!image_url) return Response.json({ error: "缺少 image_url" }, { status: 400 });
        if (!prompt?.trim()) return Response.json({ error: "请输入视频提示词" }, { status: 400 });
        result = await submitImageToVideo(image_url, prompt.trim(), { negative_prompt });
        break;
      }

      case "videoedit":
      case "happyhorse-videoedit": {
        const { video_url, prompt } = body;
        if (!video_url) return Response.json({ error: "缺少 video_url" }, { status: 400 });
        if (!prompt?.trim()) return Response.json({ error: "请输入编辑指令" }, { status: 400 });
        result = await submitVideoEdit(type, video_url, prompt.trim());
        break;
      }

      default:
        return Response.json({
          error: `不支持的视频类型: ${type}（支持: t2v, i2v, videoedit, happyhorse-videoedit）`,
        }, { status: 400 });
    }

    return Response.json({
      task_id: result.task_id,
      status: "PENDING",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
