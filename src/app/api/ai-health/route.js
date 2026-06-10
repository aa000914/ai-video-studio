/**
 * GET /api/ai-health — 返回当前 AI Provider 配置状态
 */

export async function GET() {
  return Response.json({
    provider: "dashscope",
    textModel: process.env.QWEN_TEXT_MODEL || "qwen3.7-max-preview",
    imageModel: process.env.QWEN_IMAGE_MODEL || "qwen-image-2.0-pro",
    imageFallbackModel: process.env.QWEN_IMAGE_FALLBACK_MODEL || "qwen-image-2.0",
    videoT2VModel: process.env.HAPPYHORSE_VIDEO_MODEL || process.env.WAN_T2V_MODEL || "happyhorse-1.0-video",
    videoI2VModel: process.env.HAPPYHORSE_VIDEO_MODEL || process.env.WAN_I2V_MODEL || "happyhorse-1.0-video",
    happyHorseModel: process.env.HAPPYHORSE_VIDEO_MODEL || "happyhorse-1.0-video",
    hasDashscopeKey: !!process.env.DASHSCOPE_API_KEY,
  });
}
