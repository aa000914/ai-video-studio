/**
 * @deprecated 已切换至阿里 DashScope Qwen 模型
 * 内部调用 qwen.js，保持原有 callDeepSeek / parseJsonResponse 签名不变。
 * 所有 API 路由无需修改 import 即可完成切换。
 */
import { callQwenText, parseJsonResponse } from "./qwen";

export async function callDeepSeek(messages, options = {}) {
  return callQwenText(messages, { ...options, _route: "deepseek-shim" });
}

export { parseJsonResponse };
