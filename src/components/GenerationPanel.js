"use client";

import { useState } from "react";
import CostEstimator from "./CostEstimator";

const TASK_TYPES = [
  { value: "text_to_image", label: "文生图", icon: "🖼" },
  { value: "image_to_video", label: "图生视频", icon: "🎬" },
  { value: "text_to_video", label: "文生视频", icon: "🎥" },
  { value: "audio_video", label: "音画视频", icon: "🔊" },
  { value: "lip_sync", label: "口型同步", icon: "👄" },
  { value: "prompt_polish", label: "AI 润色", icon: "✨" },
];

const PROVIDERS = [
  { value: "dashscope", label: "DashScope (百炼)", available: true },
  { value: "deepseek", label: "DeepSeek", available: true },
  { value: "kling", label: "可灵 Kling", available: false },
  { value: "jimeng", label: "即梦 Jimeng", available: false },
  { value: "seko", label: "Seko", available: false },
];

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["720p", "1080p"];
const DURATIONS = [5, 10];
const OUTPUT_COUNTS = [1, 2, 3, 4];

export default function GenerationPanel({ shot, projectId, onGenerated, shotsTotal = 0 }) {
  const [taskType, setTaskType] = useState("text_to_image");
  const [provider, setProvider] = useState("dashscope");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [numOutputs, setNumOutputs] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [useRefImage, setUseRefImage] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedProvider = PROVIDERS.find((p) => p.value === provider);
  const isPlaceholder = !selectedProvider?.available && ["kling", "jimeng", "seko"].includes(provider);

  function showMessage(text, type) { setMessage({ text, type }); setTimeout(() => setMessage(null), 4000); }

  async function handleGenerate() {
    if (isPlaceholder) {
      showMessage("当前为预留能力，接入" + selectedProvider?.label + "后可用。", "info");
      return;
    }

    if (audioEnabled && taskType === "audio_video") {
      showMessage("音画视频为预留能力，接入可灵/其他音画模型后可用。", "info");
      return;
    }

    if (taskType === "lip_sync") {
      showMessage("口型同步为预留能力，接入对应模型后可用。", "info");
      return;
    }

    if (!shot) { showMessage("请选择镜头", "error"); return; }

    // map to existing API type names
    let apiType;
    switch (taskType) {
      case "text_to_image": apiType = "image"; break;
      case "image_to_video": apiType = "i2v"; break;
      case "text_to_video": apiType = "t2v"; break;
      default: apiType = "image"; break;
    }

    setSubmitting(true);
    try {
      const sizeMap = { "16:9": "1280*720", "9:16": "720*1280", "1:1": "1024*1024", "4:3": "1024*768", "3:4": "768*1024" };

      const body = {
        projectId, shotId: shot.id,
        type: apiType,
        prompt: taskType === "text_to_image" ? (shot.refined_image_prompt || shot.image_prompt) : (shot.refined_video_prompt || shot.video_prompt || "Generate video"),
        size: sizeMap[aspectRatio] || "1280*720",
        duration: String(duration) + "s",
        resolution: resolution === "1080p" ? "1080P" : "720P",
      };

      if (apiType === "i2v") {
        body.imageUrl = shot.selected_image_url || shot.image_url;
        if (!body.imageUrl) { showMessage("请先生成首帧图", "error"); setSubmitting(false); return; }
      }

      const res = await fetch("/api/generation/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");

      if (data.status === "succeeded") showMessage("生成完成", "success");
      else showMessage("任务已提交", "success");

      onGenerated?.();
    } catch (err) { showMessage(err.message, "error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-3 py-2 rounded-lg text-xs ${message.type === "error" ? "bg-red-50 text-red-600" : message.type === "info" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
          {message.text}
        </div>
      )}

      {/* Task type selector */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">任务类型</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TASK_TYPES.map((t) => (
            <button key={t.value} onClick={() => setTaskType(t.value)}
              className={`px-2 py-2 rounded-lg text-xs transition-all ${
                taskType === t.value ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Provider</label>
        <div className="grid grid-cols-2 gap-1.5">
          {PROVIDERS.map((p) => (
            <button key={p.value} onClick={() => setProvider(p.value)}
              disabled={!p.available}
              className={`px-2 py-2 rounded-lg text-xs transition-all ${
                provider === p.value ? "bg-purple-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              } ${!p.available ? "opacity-40 cursor-not-allowed" : ""}`}>
              {p.label} {!p.available && "🔒"}
            </button>
          ))}
        </div>
      </div>

      {/* Config rows */}
      <div className="grid grid-cols-2 gap-3">
        <ConfigSelect label="比例" value={aspectRatio} options={ASPECT_RATIOS} onChange={setAspectRatio} />
        <ConfigSelect label="分辨率" value={resolution} options={RESOLUTIONS} onChange={setResolution} />
        <ConfigSelect label="时长(s)" value={duration} options={DURATIONS} onChange={setDuration} />
        <ConfigSelect label="数量" value={numOutputs} options={OUTPUT_COUNTS} onChange={setNumOutputs} />
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          🔊 音画同出
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={useRefImage} onChange={(e) => setUseRefImage(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          📷 参考图
        </label>
      </div>

      {/* cost estimator */}
      <CostEstimator taskType={taskType} count={numOutputs} resolution={resolution} duration={duration} shotsTotal={shotsTotal} />

      {/* Audio placeholder */}
      {audioEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            🔊 音画同出为预留能力。接入可灵/即梦等音画模型后将支持：TTS + 环境音 + BGM + 口型同步。
          </p>
        </div>
      )}

      {/* Submit */}
      <button onClick={handleGenerate} disabled={submitting}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
        {submitting ? "提交中..." : isPlaceholder ? "🔒 预留能力" : "🚀 开始生成"}
      </button>
    </div>
  );
}

function ConfigSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value === String(Number(e.target.value)) ? Number(e.target.value) : e.target.value)}
        className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
