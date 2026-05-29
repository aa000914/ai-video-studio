"use client";

import { useState, useEffect } from "react";

const STATUS_OPTIONS = ["待生成", "已生成图", "已生成视频", "需重做", "已通过"];
const STATUS_COLORS = {
  "待生成": "bg-gray-100 text-gray-600",
  "已生成图": "bg-blue-100 text-blue-700",
  "已生成视频": "bg-purple-100 text-purple-700",
  "需重做": "bg-red-100 text-red-700",
  "已通过": "bg-green-100 text-green-700",
};

const IMAGE_MODELS = ["wan2.7-image-pro", "wan2.7-image"];
const IMAGE_MODEL_HINTS = {
  "wan2.7-image-pro": "wan2.7-image-pro — 免费额度 50，主力生图模型。",
  "wan2.7-image": "wan2.7-image — 免费额度 50，回退模型。",
};
const VIDEO_MODELS = ["wan2.7-t2v", "wan2.7-i2v-2026-04-25", "wan2.7-videoedit", "happyhorse-1.0-video-edit"];
const VIDEO_MODEL_LABELS = {
  "wan2.7-t2v": "文生视频 (40/50免费)",
  "wan2.7-i2v-2026-04-25": "图生视频 (50/50免费)",
  "wan2.7-videoedit": "视频编辑 WAN (50/50免费)",
  "happyhorse-1.0-video-edit": "HappyHorse 编辑 (10/10免费)",
};
const RESOLUTIONS = ["720P", "1080P"];
const VIDEO_DURATIONS = ["5s", "10s"];

export default function ShotEditorPanel({ projectId }) {
  const [shots, setShots] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedField, setCopiedField] = useState("");

  // Model config
  const [imageModel, setImageModel] = useState("wan2.7-image-pro");
  const [videoModel, setVideoModel] = useState("wan2.7-t2v");
  const [resolution, setResolution] = useState("720P");
  const [videoDuration, setVideoDuration] = useState("5s");

  // DashScope text-to-image
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageTaskId, setImageTaskId] = useState("");
  const [imageTaskStatus, setImageTaskStatus] = useState("idle"); // idle | submitting | running | succeeded | failed
  const [resultImageUrl, setResultImageUrl] = useState("");
  const [imageError, setImageError] = useState("");

  // DashScope video generation
  const [videoTaskStatus, setVideoTaskStatus] = useState("idle"); // idle | submitting | running | succeeded | failed
  const [resultVideoUrl, setResultVideoUrl] = useState("");
  const [videoError, setVideoError] = useState("");
  const [videoModelName, setVideoModelName] = useState("wan2.7-t2v");
  const [selectedVideoMode, setSelectedVideoMode] = useState("t2v"); // t2v | i2v

  const selected = shots[selectedIdx];
  const totalShots = shots.length;

  // Dimension mapping
  const RATIO_DIMS = {
    "9:16": { width: 720, height: 1280 },
    "16:9": { width: 1280, height: 720 },
    "3:4": { width: 768, height: 1024 },
    "4:3": { width: 1024, height: 768 },
  };
  const dims = RATIO_DIMS[aspectRatio] || RATIO_DIMS["16:9"];

  // Credit calculation
  const imageCredits = totalShots * 2;
  const videoRate = resolution === "1080P" ? 20 : 10;
  const durationMultiplier = videoDuration === "10s" ? 2 : 1;
  const videoCredits = totalShots * videoRate * durationMultiplier;
  const totalCredits = imageCredits + videoCredits;

  useEffect(() => { loadShots(); loadPlanAspect(); }, [projectId]);

  // Reset generation state when switching shots, load existing image
  useEffect(() => {
    const s = shots[selectedIdx];
    setResultImageUrl(s?.image_url || "");
    setResultVideoUrl(s?.video_url || "");
    setImageTaskStatus(s?.image_url ? "succeeded" : "idle");
    setVideoTaskStatus(s?.video_url ? "succeeded" : "idle");
    setImageTaskId("");
    setImageError("");
    setVideoError("");
  }, [selectedIdx]);

  async function loadPlanAspect() {
    try {
      const res = await fetch(`/api/plans?project_id=${projectId}`);
      const json = await res.json();
      if (json.data?.aspect_ratio) setAspectRatio(json.data.aspect_ratio);
    } catch { /* keep default */ }
  }

  async function loadShots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shots?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) {
        const data = json.data || [];
        data.sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
        setShots(data);
      }
    } catch (err) { setMessage("加载失败: " + err.message); }
    finally { setLoading(false); }
  }

  function updateField(field, value) {
    setShots((prev) => prev.map((s, i) => (i === selectedIdx ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shots/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visual: selected.visual,
          dialogue: selected.dialogue,
          camera: selected.camera,
          image_prompt: selected.image_prompt,
          video_prompt: selected.video_prompt,
          refined_image_prompt: selected.refined_image_prompt,
          refined_video_prompt: selected.refined_video_prompt,
          status: selected.status,
          sound: selected.sound,
          notes: selected.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      setMessage("保存成功");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) { setMessage("保存失败: " + err.message); }
    finally { setSaving(false); }
  }

  async function handlePolish(field) {
    if (!selected) return;
    const sourceText = field === "image" ? selected.image_prompt : selected.video_prompt;
    if (!sourceText || !sourceText.trim()) {
      setMessage("请先填写提示词内容");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    setPolishing(true);
    setMessage("");
    try {
      const res = await fetch("/api/polish-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: field,
          prompt: sourceText,
          shot: {
            shot_number: selected.shot_number,
            scene_name: selected.scene_name,
            characters: selected.characters,
            visual: selected.visual,
            camera: selected.camera,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "润色失败");

      const polished = json.data?.polished;
      if (polished) {
        const targetField = field === "image" ? "refined_image_prompt" : "refined_video_prompt";
        updateField(targetField, polished);
      }
      setMessage("润色完成，可手动修改");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) { setMessage("润色失败: " + err.message); }
    finally { setPolishing(false); }
  }

  function truncatePrompt(text, maxLen) {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  async function handleGenerateImage() {
    if (!selected) return;
    const promptText = selected.refined_image_prompt || selected.image_prompt;
    if (!promptText || !promptText.trim()) {
      setMessage("请先填写图片提示词");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    setImageTaskStatus("submitting");
    setResultImageUrl("");
    setImageError("");
    setMessage("");

    try {
      // Submit task
      const submitRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: truncatePrompt(promptText.trim(), 600),
          size: `${dims.width}*${dims.height}`,
          ref_image: selected.ref_image_url || "",
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "提交失败");

      // Case 1: Sync mode — results returned directly
      if (submitData.status === "SUCCEEDED" && submitData.results?.length > 0) {
        const url = submitData.results[0].url;
        if (url) {
          setResultImageUrl(url);
          setImageTaskStatus("succeeded");
          saveShotField("image_url", url);
          return;
        }
      }

      // Case 2: Async mode — poll for results
      const taskId = submitData.task_id;
      if (!taskId) throw new Error("未返回任务 ID");
      setImageTaskId(taskId);
      setImageTaskStatus("running");

      const maxAttempts = 30; // ~60 seconds timeout
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const pollRes = await fetch(`/api/media-task?task_id=${encodeURIComponent(taskId)}`);
        const pollData = await pollRes.json();

        if (!pollRes.ok) throw new Error(pollData.error || "查询失败");

        if (pollData.status === "SUCCEEDED") {
          const url = pollData.results?.[0]?.url;
          if (url) {
            setResultImageUrl(url);
            setImageTaskStatus("succeeded");
            saveShotField("image_url", url);
          } else {
            throw new Error("生成成功但未返回图片 URL");
          }
          return;
        }

        if (pollData.status === "FAILED") {
          throw new Error(pollData.error || "生成失败");
        }
      }

      throw new Error("生成超时，请稍后重试");
    } catch (err) {
      const msg = err.message;
      if (msg.includes("403") || msg.includes("AccessDenied") || msg.includes("免费额度")) {
        setImageError("免费额度已用完或免费额度用完即停已触发。");
        setMessage("生图失败: 免费额度已用完");
      } else {
        setImageError(msg);
        setMessage("生图失败: " + msg);
      }
      setImageTaskStatus("failed");
    }
  }

  async function saveShotField(field, value) {
    if (!selected) return;
    try {
      await fetch(`/api/shots/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch { /* best effort */ }
  }

  function handleRetryImage() {
    setImageTaskStatus("idle");
    setResultImageUrl("");
    setImageTaskId("");
    setImageError("");
    setMessage("");
    setTimeout(() => handleGenerateImage(), 300);
  }

  async function handleGenerateVideo(mode) {
    if (!selected) return;
    setSelectedVideoMode(mode);
    setResultVideoUrl("");
    setVideoError("");
    setVideoTaskStatus("submitting");
    setMessage("");

    const promptText = selected.refined_video_prompt || selected.video_prompt;
    if (!promptText?.trim() && mode === "t2v") {
      setMessage("请先填写视频提示词");
      setVideoTaskStatus("idle");
      return;
    }

    try {
      const body = { type: mode };
      if (mode === "t2v") {
        body.prompt = promptText.trim();
      } else if (mode === "i2v") {
        const imageUrl = resultImageUrl || selected.image_url;
        if (!imageUrl) {
          setMessage("请先生成分镜图");
          setVideoTaskStatus("idle");
          return;
        }
        body.image_url = imageUrl;
        body.prompt = promptText?.trim() || "Generate video from this image";
        if (promptText?.trim()) body.prompt = promptText.trim();
      }

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");

      const taskId = data.task_id;
      if (!taskId) throw new Error("未返回任务 ID");

      setVideoTaskStatus("running");

      // Poll for result
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 3000));

        const pollRes = await fetch(`/api/media-task?task_id=${encodeURIComponent(taskId)}`);
        const pollData = await pollRes.json();
        if (!pollRes.ok) throw new Error(pollData.error || "查询失败");

        if (pollData.status === "SUCCEEDED") {
          const url = pollData.results?.[0]?.url;
          if (url) {
            setResultVideoUrl(url);
            setVideoTaskStatus("succeeded");
            setMessage("视频生成成功");
            saveShotField("video_url", url);
          } else {
            throw new Error("生成成功但未返回视频 URL");
          }
          return;
        }

        if (pollData.status === "FAILED") {
          throw new Error(pollData.error || "视频生成失败");
        }
      }
      throw new Error("视频生成超时，请稍后重试");
    } catch (err) {
      const msg = err.message;
      if (msg.includes("403") || msg.includes("AccessDenied")) {
        setVideoError("免费额度已用完或免费额度用完即停已触发。");
      } else {
        setVideoError(msg);
      }
      setVideoTaskStatus("failed");
      setMessage("视频生成失败: " + (msg.includes("403") ? "免费额度已用完" : msg));
    }
  }

  function handleRetryVideo() {
    setVideoTaskStatus("idle");
    setResultVideoUrl("");
    setVideoError("");
    setTimeout(() => handleGenerateVideo(selectedVideoMode), 300);
  }

  // Batch generation state
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });
  const [batchAbort, setBatchAbort] = useState(false);

  async function handleBatchGenerate() {
    setBatchGenerating(true);
    setBatchAbort(false);
    const ungenerated = shots.filter((s) => !s.image_url);
    setBatchProgress({ done: 0, total: ungenerated.length, current: "" });

    for (let i = 0; i < ungenerated.length; i++) {
      if (batchAbort) break;
      const s = ungenerated[i];
      setBatchProgress({ done: i, total: ungenerated.length, current: `镜头 #${s.shot_number}` });

      const promptText = s.refined_image_prompt || s.image_prompt;
      if (!promptText?.trim()) continue;

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: truncatePrompt(promptText.trim(), 600),
            size: `${dims.width}*${dims.height}`,
            ref_image: s.ref_image_url || "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "失败");

        let url = null;
        if (data.results?.[0]?.url) {
          url = data.results[0].url;
        } else if (data.task_id) {
          for (let j = 0; j < 30; j++) {
            await new Promise((r) => setTimeout(r, 2000));
            const poll = await fetch(`/api/media-task?task_id=${data.task_id}`);
            const pollData = await poll.json();
            if (pollData.status === "SUCCEEDED" && pollData.results?.[0]?.url) {
              url = pollData.results[0].url;
              break;
            }
            if (pollData.status === "FAILED") break;
          }
        }

        if (url) {
          await fetch(`/api/shots/${s.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: url }),
          });
        }
      } catch { /* skip failed shots */ }
    }

    setBatchGenerating(false);
    setBatchProgress((prev) => ({ ...prev, current: "" }));
    setMessage("批量生成完成");
    loadShots();
    setTimeout(() => setMessage(""), 3000);
  }

  async function copyText(text, field) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    } catch { /* ignore */ }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>;

  if (shots.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="font-semibold text-gray-900 mb-2">暂无分镜数据</h3>
        <p className="text-sm text-gray-500">请先在"分镜剧本"标签中生成分镜</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 h-full" style={{ minHeight: "calc(100vh - 280px)" }}>
      {/* Three-column layout */}
      <div className="flex flex-1 gap-0 bg-white border rounded-xl overflow-hidden min-h-0">
        {/* Left: Shot list */}
        <div className="w-60 border-r bg-gray-50 shrink-0 overflow-auto">
          <div className="p-3 border-b bg-white sticky top-0 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase">分镜列表 ({shots.length})</h3>
          </div>
          {shots.map((s, i) => (
            <button key={s.id} onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
                i === selectedIdx ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">#{s.shot_number}</span>
                <span className={`text-xs px-1.5 py-0 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                  {s.status || "待生成"}
                </span>
              </div>
              {/* Thumbnail + status icons */}
              <div className="flex items-center gap-2 mt-1.5">
                {s.image_url ? (
                  <img src={s.image_url} className="w-10 h-10 rounded object-cover shrink-0 border" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-200 border shrink-0 flex items-center justify-center text-gray-400 text-[10px]">
                    空
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 truncate">{s.scene_name || "—"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {s.image_url && <span className="text-[10px]" title="有图">🖼</span>}
                    {s.video_url && <span className="text-[10px]" title="有视频">🎬</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Center: Shot detail + image preview */}
        <div className="flex-1 overflow-auto p-5 border-r">
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  镜头 #{selected.shot_number}
                  <span className="text-gray-400 font-normal text-sm ml-2">{selected.duration}</span>
                </h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-600"}`}>
                  {selected.status || "待生成"}
                </span>
              </div>

              {/* Image preview area — DashScope */}
              {imageTaskStatus === "submitting" ? (
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50/50 min-h-[180px] flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-blue-600 font-medium">正在提交生图任务...</p>
                </div>
              ) : imageTaskStatus === "running" ? (
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center bg-purple-50/50 min-h-[180px] flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-purple-600 font-medium">AI 正在生成中...</p>
                  <p className="text-xs text-purple-400 mt-1">
                    模型：{process.env.NEXT_PUBLIC_IMAGE_MODEL || "qwen-image-2.0-pro"} | 任务：{imageTaskId?.slice(0, 12)}...
                  </p>
                </div>
              ) : imageTaskStatus === "succeeded" && resultImageUrl ? (
                <div className="rounded-xl overflow-hidden bg-gray-100 min-h-[180px] flex flex-col items-center justify-center relative">
                  <img
                    src={resultImageUrl}
                    alt={`Shot ${selected.shot_number} preview`}
                    className="max-w-full max-h-[400px] object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                    <a href={resultImageUrl} target="_blank" rel="noopener noreferrer"
                      className="bg-white/90 text-gray-700 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      打开原图
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(resultImageUrl); setMessage("图片链接已复制"); setTimeout(() => setMessage(""), 2000); }}
                      className="bg-white/90 text-gray-700 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      复制图片链接
                    </button>
                    <button onClick={() => copyText(selected.refined_image_prompt || selected.image_prompt, "previewImage")}
                      className="bg-white/90 text-blue-600 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      {copiedField === "previewImage" ? "已复制" : "复制图片提示词"}
                    </button>
                    <button onClick={handleGenerateImage}
                      className="bg-white/90 text-green-600 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      重新生成
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-white/80 text-green-700 px-2 py-0.5 rounded text-xs">
                    阿里云百炼 · wan2.7-image-pro
                  </div>
                </div>
              ) : imageTaskStatus === "failed" ? (
                <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center bg-red-50 min-h-[180px] flex flex-col items-center justify-center">
                  <div className="text-red-400 text-3xl mb-2">⚠️</div>
                  <h4 className="text-sm font-medium text-red-500 mb-1">生成失败</h4>
                  <p className="text-xs text-red-400 mb-3">{imageError || "请重试"}</p>
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    <button onClick={() => copyText(selected.refined_image_prompt || selected.image_prompt, "errorCopyPrompt")}
                      className="border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-50 bg-white">
                      {copiedField === "errorCopyPrompt" ? "已复制提示词" : "复制图片提示词"}
                    </button>
                    <button onClick={handleRetryImage}
                      className="border border-amber-300 text-amber-600 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-50 bg-white">
                      重新生成
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 min-h-[180px] flex flex-col items-center justify-center">
                  <div className="text-gray-300 text-4xl mb-3">🖼️</div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">分镜图预览区</h4>
                  <p className="text-xs text-gray-300">点击右侧"生成分镜图预览"使用阿里云百炼生图</p>
                </div>
              )}

              {/* Video preview */}
              {videoTaskStatus === "submitting" ? (
                <div className="border-2 border-dashed border-pink-300 rounded-xl p-8 text-center bg-pink-50/50 min-h-[120px] flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-pink-600 font-medium">正在提交视频任务...</p>
                </div>
              ) : videoTaskStatus === "running" ? (
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center bg-purple-50/50 min-h-[120px] flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-purple-600 font-medium">AI 正在生成视频...</p>
                  <p className="text-xs text-purple-400 mt-1">模型：{selectedVideoMode === "t2v" ? "wan2.7-t2v" : "wan2.7-i2v"} | 轮询中</p>
                </div>
              ) : videoTaskStatus === "succeeded" && resultVideoUrl ? (
                <div className="rounded-xl overflow-hidden bg-black min-h-[200px] flex flex-col items-center justify-center relative">
                  <video src={resultVideoUrl} controls className="max-w-full max-h-[400px]" />
                  <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                    <a href={resultVideoUrl} target="_blank" rel="noopener noreferrer"
                      className="bg-white/90 text-gray-700 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      打开原视频
                    </a>
                    <button onClick={() => { navigator.clipboard.writeText(resultVideoUrl); setMessage("视频链接已复制"); setTimeout(() => setMessage(""), 2000); }}
                      className="bg-white/90 text-gray-700 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      复制视频链接
                    </button>
                    <button onClick={handleRetryVideo}
                      className="bg-white/90 text-green-600 px-2.5 py-1 rounded text-xs hover:bg-white shadow-sm border">
                      重新生成
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
                    阿里云百炼 · {selectedVideoMode === "t2v" ? "wan2.7-t2v" : "wan2.7-i2v"}
                  </div>
                </div>
              ) : videoTaskStatus === "failed" ? (
                <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center bg-red-50 min-h-[120px] flex flex-col items-center justify-center">
                  <span className="text-red-400 text-lg">⚠️ 视频生成失败</span>
                  <p className="text-xs text-red-400 mt-1">{videoError || "请重试"}</p>
                  <button onClick={handleRetryVideo} className="mt-2 border border-amber-300 text-amber-600 px-3 py-1 rounded-lg text-xs hover:bg-amber-50">
                    重新生成
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <Field label="场景" value={selected.scene_name} />
                <Field label="出场角色" value={selected.characters} />
                <Field label="时长" value={selected.duration} />
                <Field label="运镜" value={selected.camera} />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">画面描述</label>
                <textarea value={selected.visual || ""} onChange={(e) => updateField("visual", e.target.value)}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">台词 / 旁白</label>
                <textarea value={selected.dialogue || ""} onChange={(e) => updateField("dialogue", e.target.value)}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">音效配乐</label>
                <input value={selected.sound || ""} onChange={(e) => updateField("sound", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">制作备注</label>
                <textarea value={selected.notes || ""} onChange={(e) => updateField("notes", e.target.value)}
                  rows={2} placeholder="添加工艺说明、特殊要求等..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">状态</label>
                <select value={selected.status || "待生成"} onChange={(e) => updateField("status", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "保存中..." : "保存当前分镜"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Prompt editor + Credit estimation */}
        <div className="w-80 shrink-0 overflow-auto p-5 bg-gray-50">
          {selected && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">提示词与执行区</h3>

              {/* Image prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">图片提示词</label>
                  <button onClick={() => copyText(selected.image_prompt, "image")}
                    className="text-xs text-blue-500 hover:underline">
                    {copiedField === "image" ? "已复制" : "复制"}
                  </button>
                </div>
                <textarea value={selected.image_prompt || ""} onChange={(e) => updateField("image_prompt", e.target.value)}
                  rows={4} placeholder="英文图片提示词..."
                  className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white" />
                <button onClick={() => handlePolish("image")} disabled={polishing}
                  className="mt-1.5 w-full border border-blue-200 text-blue-600 py-1.5 rounded text-xs hover:bg-blue-50 disabled:opacity-50">
                  {polishing ? "AI润色中..." : "AI 润色图片提示词"}
                </button>

                {/* Reference image input */}
                <div className="border-t pt-3 mt-3">
                  <label className="text-[10px] text-gray-400 mb-1 block">参考图片 URL（可选，用于角色/场景一致性）</label>
                  <input
                    value={selected.ref_image_url || ""}
                    onChange={(e) => updateField("ref_image_url", e.target.value)}
                    placeholder="输入参考图片 URL..."
                    className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white mb-2"
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={imageTaskStatus === "submitting" || imageTaskStatus === "running"}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {imageTaskStatus === "submitting"
                      ? "提交中..."
                      : imageTaskStatus === "running"
                      ? "生成中..."
                      : "🎨 生成分镜图 · wan2.7-image-pro"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    免费额度 50 · 同步生成
                  </p>
                </div>
              </div>

              {/* Video prompt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">视频提示词</label>
                  <button onClick={() => copyText(selected.video_prompt, "video")}
                    className="text-xs text-blue-500 hover:underline">
                    {copiedField === "video" ? "已复制" : "复制"}
                  </button>
                </div>
                <textarea value={selected.video_prompt || ""} onChange={(e) => updateField("video_prompt", e.target.value)}
                  rows={4} placeholder="英文视频提示词..."
                  className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white" />
                <button onClick={() => handlePolish("video")} disabled={polishing}
                  className="mt-1.5 w-full border border-purple-200 text-purple-600 py-1.5 rounded text-xs hover:bg-purple-50 disabled:opacity-50">
                  {polishing ? "AI润色中..." : "AI 润色视频提示词"}
                </button>
                {/* Video generation buttons */}
                <div className="border-t pt-3 mt-3 space-y-2">
                  <button
                    onClick={() => handleGenerateVideo("t2v")}
                    disabled={videoTaskStatus === "submitting" || videoTaskStatus === "running"}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {videoTaskStatus === "submitting"
                      ? "提交中..."
                      : videoTaskStatus === "running"
                      ? "视频生成中..."
                      : "🎬 文生视频 · wan2.7-t2v"}
                  </button>
                  <button
                    onClick={() => handleGenerateVideo("i2v")}
                    disabled={videoTaskStatus === "submitting" || videoTaskStatus === "running"}
                    className="w-full border border-purple-300 text-purple-700 py-2 rounded text-xs font-medium hover:bg-purple-50 disabled:opacity-50 transition-all"
                  >
                    {videoTaskStatus === "running"
                      ? "生成中..."
                      : "🔄 图转视频 · wan2.7-i2v"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    阿里云百炼 · 异步生成
                  </p>
                </div>
              </div>

              {/* Refined prompts */}
              {(selected.refined_image_prompt || selected.refined_video_prompt) && (
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold text-gray-500 mb-3">润色结果（可手动修改）</h4>
                  {selected.refined_image_prompt && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-green-600 font-medium">润色后图片提示词</label>
                        <button onClick={() => copyText(selected.refined_image_prompt, "refined_image")}
                          className="text-xs text-blue-500 hover:underline">
                          {copiedField === "refined_image" ? "已复制" : "复制"}
                        </button>
                      </div>
                      <textarea value={selected.refined_image_prompt}
                        onChange={(e) => updateField("refined_image_prompt", e.target.value)}
                        rows={4} className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400 resize-none bg-white" />
                    </div>
                  )}
                  {selected.refined_video_prompt && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-purple-600 font-medium">润色后视频提示词</label>
                        <button onClick={() => copyText(selected.refined_video_prompt, "refined_video")}
                          className="text-xs text-blue-500 hover:underline">
                          {copiedField === "refined_video" ? "已复制" : "复制"}
                        </button>
                      </div>
                      <textarea value={selected.refined_video_prompt}
                        onChange={(e) => updateField("refined_video_prompt", e.target.value)}
                        rows={4} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none bg-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Prompt structure guide */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">提示词结构参考</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  画风 + 景别 + 主体动作 + 背景环境 + 光线氛围 + 镜头语言
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
              message.includes("失败") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Model Config */}
      <div className="bg-white border rounded-xl p-5 mt-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">生成配置</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">生图模型</label>
            <select value={imageModel} onChange={(e) => setImageModel(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {IMAGE_MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">{IMAGE_MODEL_HINTS[imageModel] || ""}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">视频模型</label>
            <select value={videoModel} onChange={(e) => setVideoModel(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {VIDEO_MODELS.map((m) => (
                <option key={m} value={m}>{VIDEO_MODEL_LABELS[m] || m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">分辨率</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {RESOLUTIONS.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">单镜头视频时长</label>
            <select value={videoDuration} onChange={(e) => setVideoDuration(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {VIDEO_DURATIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
        </div>

        {/* Batch generation */}
        <div className="mt-4 flex gap-3 items-center">
          <button
            onClick={handleBatchGenerate}
            disabled={batchGenerating}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
          >
            {batchGenerating
              ? `批量生成中... ${batchProgress.done}/${batchProgress.total}`
              : `🚀 批量生成全部镜头图 (${shots.filter((s) => !s.image_url).length}个)`}
          </button>
          {batchGenerating && (
            <button
              onClick={() => { setBatchAbort(true); setBatchGenerating(false); }}
              className="border border-red-300 text-red-600 px-4 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-all shrink-0"
            >
              取消
            </button>
          )}
        </div>
        {batchGenerating && batchProgress.current && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-blue-700">
                正在生成 {batchProgress.current} ({batchProgress.done}/{batchProgress.total})
              </p>
            </div>
            <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700">
            <strong>⚠️ 当前使用百炼免费额度</strong>，免费额度用完会返回 403，不会继续生成。
            如需继续使用，请在阿里云百炼控制台关闭"仅使用免费额度"模式。
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}
