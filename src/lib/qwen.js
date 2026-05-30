/**
 * Qwen 文本模型统一客户端 (DashScope OpenAI 兼容接口)
 *
 * 替代 DeepSeek，使用阿里 DashScope 免费额度。
 * 模型: qwen3.7-max-preview (默认) 或 deepseek-v4-flash (快速备用)
 */

const BASE_URL = process.env.DASHSCOPE_OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const MODEL = process.env.QWEN_TEXT_MODEL || "qwen3.7-max-preview";

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("Missing DASHSCOPE_API_KEY");
  return key;
}

export async function callQwenText(messages, options = {}) {
  const { temperature = 0.7, maxTokens = 4096, model = MODEL } = options;
  const routeName = options._route || "unknown";

  console.log(`[QWEN_TEXT_CALL] model=${model} route=${routeName} msgs=${messages.length}`);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`[QWEN_TEXT_ERROR] model=${model} status=${res.status} err=${err.slice(0, 200)}`);
      throw new Error(`Qwen API error (${res.status}): ${err.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`[QWEN_TEXT_OK] model=${model} len=${content.length}`);
    return content;
  } catch (e) {
    console.log(`[QWEN_TEXT_ERROR] model=${model} error=${e.message}`);
    throw e;
  }
}

/** 解析 JSON 响应（兼容 markdown 代码块） */
export function parseJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}
