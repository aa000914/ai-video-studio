/**
 * DashScope (阿里云百炼) API 客户端
 *
 * 支持：
 * - 文生图 (text-to-image) — 同步 multimodal 接口 (wan2.6-t2i)
 * - 文生图 (text-to-image) — 异步旧接口 (wanx-v1 回退)
 * - 图生视频、文生视频、视频编辑 (异步)
 *
 * 响应格式自适应：
 * - multimodal 接口: output.choices[].message.content[].image
 * - 旧接口: output.results[].url / image_base64
 * - 统一对外暴露 { results: [{ url }] }
 */

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

const SERVICE_ENDPOINTS = {
  "text2image": "services/aigc/text2image/image-synthesis",
  "multimodal": "services/aigc/multimodal-generation/generation",
  "video-generation": "services/aigc/video-generation/video-synthesis",  // wan2.7 统一视频端点
};

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("Missing DASHSCOPE_API_KEY");
  return key;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

function asyncHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "X-DashScope-Async": "enable",
  };
}

/** 从 multimodal 响应中提取图片 URL */
function extractMultimodalResults(data) {
  const choices = data.output?.choices || [];
  const urls = [];
  for (const choice of choices) {
    const contents = choice.message?.content || [];
    for (const c of contents) {
      if (c.image) urls.push({ url: c.image });
    }
  }
  return urls;
}

/** 从旧接口响应中提取结果 */
function extractLegacyResults(data) {
  const results = data.output?.results || [];
  return results.map((r) => ({
    url: r.url || "",
    image_base64: r.image_base64 || "",
  }));
}

/**
 * 同步调用 multimodal 端点
 * 用于 wan2.6-t2i 等不支持 async 的模型
 */
async function callMultimodalSync(model, messages) {
  const res = await fetch(`${DASHSCOPE_BASE}/${SERVICE_ENDPOINTS.multimodal}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model, input: { messages } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope multimodal error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const results = extractMultimodalResults(data);
  return { status: "SUCCEEDED", results };
}

/**
 * 提交异步任务 (旧接口)
 * 用于 wanx-v1 等支持 async 的模型
 */
async function submitAsyncTask(endpoint, body) {
  const res = await fetch(`${DASHSCOPE_BASE}/${endpoint}`, {
    method: "POST",
    headers: asyncHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // 如果是 403 不支持异步，让调用方决定是否回退
    if (res.status === 403) {
      const errBody = JSON.parse(err);
      throw Object.assign(new Error(errBody.message || "Async not supported"), {
        code: errBody.code,
        status: res.status,
      });
    }
    throw new Error(`DashScope API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { task_id: data.output?.task_id || data.request_id };
}

/**
 * 查询异步任务状态
 */
export async function queryTask(taskId) {
  const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DashScope task query error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const output = data.output || {};

  // Log raw response for debugging (safe — no API key in response body)
  console.log("=== DashScope task query raw ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("================================");

  // Strict status mapping
  const rawStatus = output.task_status || data.task_status || data.status || "";
  const statusMap = {
    PENDING: "PENDING",
    RUNNING: "RUNNING",
    SUCCEEDED: "SUCCEEDED",
    SUCCESS: "SUCCEEDED",
    FAILED: "FAILED",
    CANCELED: "FAILED",
  };
  const taskStatus = statusMap[rawStatus] || "RUNNING";

  // Extract result URL from various possible paths
  const resultUrl =
    output.video_url ||
    output.results?.[0]?.video_url ||
    output.results?.[0]?.url ||
    output.result_url ||
    output.url ||
    data.video_url ||
    data.result_url ||
    data.url ||
    null;

  // Legacy multimodal / old-format fallback (for image tasks)
  const legacyResults =
    extractMultimodalResults(data).length > 0
      ? extractMultimodalResults(data)
      : extractLegacyResults(data);

  const fallbackUrl = legacyResults[0]?.url || null;

  return {
    status: taskStatus,
    resultUrl: resultUrl || fallbackUrl,
    error: output.message || output.error || data.message || null,
    raw: data, // full raw response for debugging
  };
}

/**
 * 提交文生图任务
 *
 * 策略（只用免费额度内模型）：
 * 1. wan2.7-image-pro — 主力（50/50免费额度）
 * 2. wan2.7-image — 回退（50/50免费额度）
 *
 * @param {string} prompt - 图片提示词
 * @param {object} options
 * @returns {Promise<{status: string, results?: Array<{url: string}>, task_id?: string}>}
 */
export async function submitImageTask(prompt, options = {}) {
  const { size, n, negative_prompt, ref_image } = options;

  const content = [{ text: prompt }];
  if (ref_image && ref_image.startsWith("http")) {
    content.push({ image: ref_image });
  }
  const messages = [{ role: "user", content }];

  // 策略 1: wan2.7-image-pro (免费额度 50)
  try {
    return await callMultimodalSync("wan2.7-image-pro", messages);
  } catch (err) {
    console.warn("wan2.7-image-pro failed:", err.message);
  }

  // 策略 2: wan2.7-image (免费额度 50)
  try {
    return await callMultimodalSync("wan2.7-image", messages);
  } catch (err) {
    console.warn("wan2.7-image failed:", err.message);
  }

  throw new Error("所有生图模型均不可用（wan2.7-image-pro / wan2.7-image），请检查免费额度");
}

/**
 * 提交异步生成任务 (供视频类调用)
 * @param {string} serviceType - "video-generation"
 * @param {object} input - { prompt } | { image_url, prompt } | { video_url, prompt }
 * @param {object} params - { resolution, duration, ... }
 * @param {string} [modelOverride] - e.g. wan2.7-t2v, wan2.7-i2v
 * @returns {Promise<{task_id: string}>}
 */
export async function submitTask(serviceType, input, params = {}, modelOverride) {
  const model = modelOverride || "wan2.7-t2v";
  const endpoint = SERVICE_ENDPOINTS[serviceType] || SERVICE_ENDPOINTS["video-generation"];
  if (!endpoint) throw new Error(`Unknown service type: ${serviceType}`);

  const body = { model, input };
  if (Object.keys(params).length > 0) body.parameters = params;

  return submitAsyncTask(endpoint, body);
}

/**
 * 将 duration 统一转为整数秒。
 * 支持 "5s" / "10s" / "5" / 5 等格式，默认 5，范围 2-15。
 */
function normalizeDuration(duration) {
  if (duration == null) return 5;
  const num = Number(String(duration).replace("s", ""));
  if (!Number.isInteger(num) || num < 2 || num > 15) return 5;
  return num;
}

/**
 * 提交文生视频任务
 *
 * DashScope 请求体：
 * {
 *   "model": WAN_T2V_MODEL,
 *   "input": { "prompt": prompt },
 *   "parameters": { "resolution", "ratio", "duration": 整数, "prompt_extend": true, "watermark": false }
 * }
 */
export async function submitTextToVideo(prompt, options = {}) {
  const model = process.env.WAN_T2V_MODEL || "wan2.7-t2v";
  const params = {
    resolution: options.resolution || "720P",
    ratio: options.ratio || "16:9",
    duration: normalizeDuration(options.duration),
    prompt_extend: true,
    watermark: false,
  };
  if (options.negative_prompt) params.negative_prompt = options.negative_prompt;
  return submitTask("video-generation", { prompt }, params, model);
}

/**
 * 提交图生视频任务
 *
 * DashScope 请求体：
 * {
 *   "model": WAN_I2V_MODEL,
 *   "input": {
 *     "prompt": prompt,
 *     "media": [{ "type": "first_frame", "url": imageUrl }]
 *   },
 *   "parameters": { "resolution", "duration": 整数, "prompt_extend": true, "watermark": false }
 * }
 */
export async function submitImageToVideo(imageUrl, prompt, options = {}) {
  const model = process.env.WAN_I2V_MODEL || "wan2.7-i2v-2026-04-25";
  const input = {
    prompt,
    media: [{ type: "first_frame", url: imageUrl }],
  };
  const params = {
    resolution: options.resolution || "720P",
    duration: normalizeDuration(options.duration),
    prompt_extend: true,
    watermark: false,
  };
  return submitTask("video-generation", input, params, model);
}

/**
 * 提交视频编辑任务
 */
export async function submitVideoEdit(serviceType, videoUrl, prompt, options = {}) {
  const defaultModel = serviceType === "happyhorse-videoedit"
    ? process.env.HAPPYHORSE_VIDEO_EDIT_MODEL || "happyhorse-1.0-video-edit"
    : process.env.WAN_VIDEO_EDIT_MODEL || "wan2.7-videoedit";
  return submitTask("video-generation", { video_url: videoUrl, prompt }, {}, defaultModel);
}

/** 根据服务类型获取模型名 */
function getModelForService(serviceType) {
  if (serviceType === "video-generation") {
    return process.env.WAN_T2V_MODEL || "wan2.7-t2v";
  }
  return serviceType;
}
