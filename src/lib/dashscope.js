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
  "text2image": "services/aigc/text2image/image-synthesis",  // 旧接口 (wanx-v1)
  "multimodal": "services/aigc/multimodal-generation/generation",  // 新 multimodal 接口
  "image2video": "services/aigc/videogeneration/image2video/wan2.7-i2v-2026-04-25",
  "text2video": "services/aigc/videogeneration/text2video/wan2.7-t2v",
  "videoedit": "services/aigc/videogeneration/video2video/wan2.7-videoedit",
  "happyhorse-videoedit": "services/aigc/videogeneration/video2video/happyhorse-1.0-video-edit",
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

  const statusMap = {
    PENDING: "PENDING",
    RUNNING: "RUNNING",
    SUCCEEDED: "SUCCEEDED",
    FAILED: "FAILED",
    CANCELED: "FAILED",
  };

  // 尝试 multimodal 格式或旧格式提取结果
  const results = extractMultimodalResults(data).length > 0
    ? extractMultimodalResults(data)
    : extractLegacyResults(data);

  return {
    status: statusMap[output.task_status] || "RUNNING",
    results,
    error: output.message || output.error || null,
  };
}

/**
 * 提交文生图任务
 *
 * 策略：
 * 1. 先用 wan2.6-t2i 同步 multimodal 接口 (最快)
 * 2. 回退到 wanx-v1 异步旧接口
 *
 * @param {string} prompt - 图片提示词
 * @param {object} options
 * @returns {Promise<{status: string, results?: Array<{url: string}>, task_id?: string}>}
 */
export async function submitImageTask(prompt, options = {}) {
  const { size, n, negative_prompt } = options;
  const preferredModel = process.env.QWEN_IMAGE_MODEL || "qwen-image-2.0-pro";

  // === 策略 1: wan2.6-t2i 同步 multimodal ===
  try {
    const messages = [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ];
    return await callMultimodalSync("wan2.6-t2i", messages);
  } catch (err) {
    // wan2.6-t2i 失败，继续尝试回退
    console.warn("wan2.6-t2i failed, trying fallbacks:", err.message);
  }

  // === 策略 2: wanx-v1 异步旧接口 ===
  try {
    const body = {
      model: "wanx-v1",
      input: { prompt },
      parameters: {},
    };
    if (size) body.parameters.size = size;
    if (n) body.parameters.n = n;
    if (negative_prompt) body.parameters.negative_prompt = negative_prompt;

    return await submitAsyncTask(SERVICE_ENDPOINTS.text2image, body);
  } catch (err) {
    console.warn("wanx-v1 failed:", err.message);
  }

  // === 策略 3: 用户的首选模型 (qwen-image-2.0-pro) ===
  if (preferredModel !== "wan2.6-t2i" && preferredModel !== "wanx-v1") {
    try {
      const isPro = preferredModel.includes("-pro");
      if (isPro) {
        const messages = [
          { role: "user", content: [{ text: prompt }] },
        ];
        return await callMultimodalSync(preferredModel, messages);
      }
      const body = {
        model: preferredModel,
        input: { prompt },
        parameters: {},
      };
      if (size) body.parameters.size = size;
      if (n) body.parameters.n = n;
      return await submitAsyncTask(SERVICE_ENDPOINTS.text2image, body);
    } catch (err) {
      console.warn("Preferred model failed:", err.message);
    }
  }

  throw new Error("所有生图模型均不可用，请检查 DASHSCOPE_API_KEY 和模型权限");
}

/**
 * 提交异步生成任务 (供视频类调用)
 * @param {string} serviceType - 服务类型
 * @param {object} input - 模型输入
 * @param {object} params - 额外参数
 * @param {string} [modelOverride] - 覆盖模型名
 * @returns {Promise<{task_id: string}>}
 */
export async function submitTask(serviceType, input, params = {}, modelOverride) {
  const model = modelOverride || getModelForService(serviceType);
  const endpoint = SERVICE_ENDPOINTS[serviceType];
  if (!endpoint) throw new Error(`Unknown service type: ${serviceType}`);

  const body = { model, input };
  if (Object.keys(params).length > 0) body.parameters = params;

  return submitAsyncTask(endpoint, body);
}

/**
 * 提交图生视频任务
 */
export async function submitImageToVideo(imageUrl, prompt, options = {}) {
  const input = { image_url: imageUrl, prompt };
  if (options.negative_prompt) input.negative_prompt = options.negative_prompt;
  return submitTask("image2video", input, options.parameters || {});
}

/**
 * 提交文生视频任务
 */
export async function submitTextToVideo(prompt, options = {}) {
  const input = { prompt };
  if (options.negative_prompt) input.negative_prompt = options.negative_prompt;
  return submitTask("text2video", input, options.parameters || {});
}

/**
 * 提交视频编辑任务
 */
export async function submitVideoEdit(serviceType, videoUrl, prompt, options = {}) {
  if (serviceType !== "videoedit" && serviceType !== "happyhorse-videoedit") {
    throw new Error(`Unsupported video edit type: ${serviceType}`);
  }
  const input = { video_url: videoUrl, prompt };
  return submitTask(serviceType, input, options.parameters || {});
}

/** 根据服务类型获取模型名 */
function getModelForService(serviceType) {
  const modelMap = {
    "text2image": process.env.QWEN_IMAGE_MODEL || "qwen-image-2.0-pro",
    "image2video": process.env.WAN_I2V_MODEL || "wan2.7-i2v-2026-04-25",
    "text2video": process.env.WAN_T2V_MODEL || "wan2.7-t2v",
    "videoedit": process.env.WAN_VIDEO_EDIT_MODEL || "wan2.7-videoedit",
    "happyhorse-videoedit": process.env.HAPPYHORSE_VIDEO_EDIT_MODEL || "happyhorse-1.0-video-edit",
  };
  return modelMap[serviceType] || serviceType;
}
