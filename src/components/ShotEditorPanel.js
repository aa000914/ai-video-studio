"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STATUS_OPTIONS = ["待生成", "已生成图", "已生成视频", "需重做", "已通过"];
const STATUS_COLORS = {
  "待生成": "bg-gray-100 text-gray-600",
  "已生成图": "bg-blue-100 text-blue-700",
  "已生成视频": "bg-purple-100 text-purple-700",
  "需重做": "bg-red-100 text-red-700",
  "已通过": "bg-green-100 text-green-700",
};

const TASK_STATUS_CONFIG = {
  pending: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  running: { label: "生成中", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  succeeded: { label: "成功", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  failed: { label: "失败", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

const IMAGE_MODELS = ["wan2.7-image-pro", "wan2.7-image"];
const IMAGE_MODEL_HINTS = {
  "wan2.7-image-pro": "主力生图模型（50/50免费额度）",
  "wan2.7-image": "回退生图模型（50/50免费额度）",
};
const VIDEO_MODELS = [
  { value: "happyhorse-1.0-video", label: "HappyHorse 全能视频（推荐）" },
  { value: "wan2.7-t2v", label: "WAN 文生视频 (40/50免费)" },
  { value: "wan2.7-i2v-2026-04-25", label: "WAN 图生视频 (50/50免费)" },
  { value: "wan2.7-videoedit", label: "WAN 视频编辑 (50/50免费)" },
  { value: "happyhorse-1.0-video-edit", label: "HappyHorse 编辑 (10/10免费·谨慎使用)" },
];
const RESOLUTIONS = ["720P", "1080P"];
const VIDEO_DURATIONS = ["5s", "10s"];
const RATIO_DIMS = {
  "9:16": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "3:4": { width: 768, height: 1024 },
  "4:3": { width: 1024, height: 768 },
};

export default function ShotEditorPanel({ projectId }) {
  const [shots, setShots] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishingImage, setPolishingImage] = useState(false);
  const [polishingVideo, setPolishingVideo] = useState(false);
  const [message, setMessage] = useState(null);

  // Model / resolution / duration config
  const [imageModel, setImageModel] = useState("wan2.7-image-pro");
  const [videoModel, setVideoModel] = useState("happyhorse-1.0-video");
  const [resolution, setResolution] = useState("720P");
  const [videoDuration, setVideoDuration] = useState("5s");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // Generation state per shot
  const [genState, setGenState] = useState({
    imageStatus: "idle", // idle | submitting | running | succeeded | failed
    videoStatus: "idle",
    imageResultUrl: "",
    videoResultUrl: "",
    imageError: "",
    videoError: "",
    imageTaskId: null, // generation_tasks.id
    videoTaskId: null,
    imageDashScopeTaskId: null,
    videoDashScopeTaskId: null,
    latestImageTask: null, // full task record for status display
    latestVideoTask: null,
  });

  const pollingRef = useRef(null);
  const [showVideoEdit, setShowVideoEdit] = useState(false);

  const selected = shots[selectedIdx];
  const totalShots = shots.length;
  const dims = RATIO_DIMS[aspectRatio] || RATIO_DIMS["16:9"];

  // Load shots on mount
  useEffect(() => { loadShots(); loadPlanAspect(); }, [projectId]);

  // Reset and load existing results when switching shots
  useEffect(() => {
    if (shots.length === 0) return;

    const s = shots[selectedIdx];
    setGenState({
      imageStatus: s.image_url ? "succeeded" : "idle",
      videoStatus: s.video_url ? "succeeded" : "idle",
      imageResultUrl: s.image_url || "",
      videoResultUrl: s.video_url || "",
      imageError: "",
      videoError: "",
      imageTaskId: null,
      videoTaskId: null,
      imageDashScopeTaskId: null,
      videoDashScopeTaskId: null,
      latestImageTask: null,
      latestVideoTask: null,
    });

    // Load latest task records for this shot
    loadShotTasks(s.id);
  }, [selectedIdx]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

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
    } catch (err) { showMessage("加载失败: " + err.message, "error"); }
    finally { setLoading(false); }
  }

  async function loadShotTasks(shotId) {
    if (!shotId) return;
    try {
      const res = await fetch(`/api/tasks?shot_id=${shotId}&limit=5`);
      const json = await res.json();
      if (res.ok && json.data?.length > 0) {
        const imageTask = json.data.find((t) => t.type === "image");
        const videoTask = json.data.find((t) => t.type === "i2v" || t.type === "t2v");

        setGenState((prev) => ({
          ...prev,
          latestImageTask: imageTask || null,
          latestVideoTask: videoTask || null,
        }));

        // If any task is running/pending, start polling
        if (imageTask && (imageTask.status === "running" || imageTask.status === "pending")) {
          setGenState((prev) => ({ ...prev, imageTaskId: imageTask.id, imageStatus: "running" }));
          startPolling(imageTask.id, "image");
        }
        if (videoTask && (videoTask.status === "running" || videoTask.status === "pending")) {
          setGenState((prev) => ({ ...prev, videoTaskId: videoTask.id, videoStatus: "running" }));
          startPolling(videoTask.id, "video");
        }
      }
    } catch { /* silent */ }
  }

  function updateShots(field, value) {
    setShots((prev) => prev.map((s, i) => (i === selectedIdx ? { ...s, [field]: value } : s)));
  }

  function showMessage(text, type = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
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
      showMessage("保存成功", "success");
    } catch (err) {
      showMessage("保存失败: " + err.message, "error");
    }
    finally { setSaving(false); }
  }

  // ===== AI Polish =====
  async function handlePolish(field) {
    if (!selected) return;
    const sourceText = field === "image" ? selected.image_prompt : selected.video_prompt;
    if (!sourceText?.trim()) {
      showMessage("请先填写提示词内容", "error");
      return;
    }

    if (field === "image") setPolishingImage(true);
    else setPolishingVideo(true);
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
        updateShots(targetField, polished);
      }
      showMessage("润色完成，可手动修改", "success");
    } catch (err) {
      showMessage("润色失败: " + err.message, "error");
    }
    finally {
      if (field === "image") setPolishingImage(false);
      else setPolishingVideo(false);
    }
  }

  // ===== Unified generation =====
  function truncatePrompt(text, maxLen) {
    if (!text) return "";
    return text.length > maxLen ? text.slice(0, maxLen) : text;
  }

  function startPolling(taskUuid, type) {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generation/status?id=${taskUuid}`);
        const data = await res.json();

        if (!res.ok) {
          handlePollError(type, data.error || "查询失败");
          return;
        }

        if (data.status === "succeeded") {
          if (data.resultUrl) {
            handlePollSuccess(type, data.resultUrl, taskUuid);
          } else {
            // Succeeded but no URL — show raw debug info
            stopPolling();
            const rawHint = data.raw
              ? "服务端已打印 raw 响应，请检查 output.video_url / output.results 等字段路径。"
              : "";
            showMessage("任务成功，但未解析到资源链接。" + rawHint, "error");
            if (type === "image") {
              setGenState((prev) => ({
                ...prev,
                imageStatus: "failed",
                imageError: "任务成功，但未解析到资源链接。请查看服务端日志。",
                imageTaskId: null,
                latestImageTask: { status: "succeeded", error_message: "未解析到资源链接", raw: data.raw },
              }));
            } else {
              setGenState((prev) => ({
                ...prev,
                videoStatus: "failed",
                videoError: "任务成功，但未解析到资源链接。请查看服务端日志。",
                videoTaskId: null,
                latestVideoTask: { status: "succeeded", error_message: "未解析到资源链接", raw: data.raw },
              }));
            }
          }
        } else if (data.status === "failed") {
          handlePollError(type, data.error || "生成失败");
        }
        // running → keep polling
      } catch (err) {
        handlePollError(type, err.message);
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function handlePollSuccess(type, resultUrl, taskUuid) {
    stopPolling();

    if (type === "image") {
      setGenState((prev) => ({
        ...prev,
        imageStatus: "succeeded",
        imageResultUrl: resultUrl,
        imageTaskId: null,
        latestImageTask: { ...prev.latestImageTask, status: "succeeded", result_url: resultUrl },
      }));
      updateShots("image_url", resultUrl);
      updateShots("status", "已生成图");
      showMessage("图片生成成功", "success");
    } else {
      setGenState((prev) => ({
        ...prev,
        videoStatus: "succeeded",
        videoResultUrl: resultUrl,
        videoTaskId: null,
        latestVideoTask: { ...prev.latestVideoTask, status: "succeeded", result_url: resultUrl },
      }));
      updateShots("video_url", resultUrl);
      updateShots("status", "已生成视频");
      showMessage("视频生成成功", "success");
    }
  }

  function handlePollError(type, errorMsg) {
    stopPolling();
    const displayMsg = errorMsg.includes("403") || errorMsg.includes("AccessDenied")
      ? "免费额度已用完或免费额度用完即停已触发。"
      : errorMsg;

    if (type === "image") {
      setGenState((prev) => ({
        ...prev,
        imageStatus: "failed",
        imageError: displayMsg,
        imageTaskId: null,
        latestImageTask: { ...prev.latestImageTask, status: "failed", error_message: displayMsg },
      }));
      showMessage("生图失败: " + displayMsg, "error");
    } else {
      setGenState((prev) => ({
        ...prev,
        videoStatus: "failed",
        videoError: displayMsg,
        videoTaskId: null,
        latestVideoTask: { ...prev.latestVideoTask, status: "failed", error_message: displayMsg },
      }));
      showMessage("视频生成失败: " + displayMsg, "error");
    }
  }

  async function handleGenerateImage() {
    if (!selected) return;
    const promptText = selected.refined_image_prompt || selected.image_prompt;
    if (!promptText?.trim()) {
      showMessage("请先填写图片提示词", "error");
      return;
    }

    stopPolling();
    setGenState((prev) => ({
      ...prev,
      imageStatus: "submitting",
      imageResultUrl: "",
      imageError: "",
      imageTaskId: null,
      latestImageTask: null,
    }));

    try {
      const res = await fetch("/api/generation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          shotId: selected.id,
          type: "image",
          prompt: truncatePrompt(promptText.trim(), 600),
          imageUrl: selected.ref_image_url || "",
          model: imageModel,
          size: `${dims.width}*${dims.height}`,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "提交失败");

      if (data.status === "succeeded") {
        // Sync completion (image models)
        setGenState((prev) => ({
          ...prev,
          imageStatus: "succeeded",
          imageResultUrl: data.resultUrl,
          latestImageTask: { status: "succeeded", result_url: data.resultUrl, type: "image" },
        }));
        updateShots("image_url", data.resultUrl);
        updateShots("status", "已生成图");
        showMessage("图片生成成功", "success");
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.error || "生成失败");
      }

      // Running — start polling
      const taskUuid = data.generationTaskId;
      setGenState((prev) => ({
        ...prev,
        imageStatus: "running",
        imageTaskId: taskUuid,
        latestImageTask: { id: taskUuid, status: "running", type: "image" },
      }));
      startPolling(taskUuid, "image");
    } catch (err) {
      const msg = err.message.includes("403") || err.message.includes("免费额度")
        ? "免费额度已用完或免费额度用完即停已触发。"
        : err.message;
      setGenState((prev) => ({
        ...prev,
        imageStatus: "failed",
        imageError: msg,
        latestImageTask: { status: "failed", error_message: msg, type: "image" },
      }));
      showMessage("生图失败: " + msg, "error");
    }
  }

  async function handleGenerateVideo(mode) {
    if (!selected) return;

    // i2v requires an image
    if (mode === "i2v") {
      const imageUrl = genState.imageResultUrl || selected.image_url;
      if (!imageUrl) {
        showMessage("请先生成分镜图", "error");
        return;
      }
    }

    const promptText = selected.refined_video_prompt || selected.video_prompt;
    if (!promptText?.trim() && mode === "t2v") {
      showMessage("请先填写视频提示词", "error");
      return;
    }

    stopPolling();
    setGenState((prev) => ({
      ...prev,
      videoStatus: "submitting",
      videoResultUrl: "",
      videoError: "",
      videoTaskId: null,
      latestVideoTask: null,
    }));

    const videoPrompt = promptText?.trim() || "Generate video from this image";

    try {
      const body = {
        projectId,
        shotId: selected.id,
        type: mode === "i2v" ? "i2v" : "t2v",
        prompt: truncatePrompt(videoPrompt, 600),
        model: videoModel,
        resolution,
        duration: videoDuration,
      };

      if (mode === "i2v") {
        body.imageUrl = genState.imageResultUrl || selected.image_url;
      }

      const res = await fetch("/api/generation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "提交失败");

      if (data.status === "failed") {
        throw new Error(data.error || "生成失败");
      }

      // Running — start polling
      const taskUuid = data.generationTaskId;
      setGenState((prev) => ({
        ...prev,
        videoStatus: "running",
        videoTaskId: taskUuid,
        latestVideoTask: { id: taskUuid, status: "running", type: mode },
      }));
      startPolling(taskUuid, "video");
    } catch (err) {
      const msg = err.message.includes("403") || err.message.includes("免费额度")
        ? "免费额度已用完或免费额度用完即停已触发。"
        : err.message;
      setGenState((prev) => ({
        ...prev,
        videoStatus: "failed",
        videoError: msg,
        latestVideoTask: { status: "failed", error_message: msg, type: mode },
      }));
      showMessage("视频生成失败: " + msg, "error");
    }
  }

  function handleCancelPolling(type) {
    stopPolling();
    if (type === "image") {
      setGenState((prev) => ({ ...prev, imageStatus: "idle", imageTaskId: null }));
    } else {
      setGenState((prev) => ({ ...prev, videoStatus: "idle", videoTaskId: null }));
    }
  }

  async function copyText(text, field) {
    try {
      await navigator.clipboard.writeText(text || "");
      showMessage(`${field === "image" ? "图片" : "视频"}提示词已复制`, "success");
    } catch { /* ignore */ }
  }

  // ===== Render helpers =====

  function renderShotList() {
    return (
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
    );
  }

  function renderTaskStatusBadge(task) {
    if (!task) return null;
    const cfg = TASK_STATUS_CONFIG[task.status];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  function renderCenterPreview() {
    if (!selected) return null;
    const { imageStatus, imageResultUrl, imageError, videoStatus, videoResultUrl, videoError, latestImageTask, latestVideoTask } = genState;

    return (
      <div className="flex-1 overflow-auto p-5 border-r">
        <div className="space-y-4">
          {/* Shot header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              镜头 #{selected.shot_number}
              <span className="text-gray-400 font-normal text-sm ml-2">{selected.duration}</span>
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-600"}`}>
              {selected.status || "待生成"}
            </span>
          </div>

          {/* Image preview */}
          {imageStatus === "submitting" ? (
            <PreviewPlaceholder type="submitting" title="正在提交生图任务..." />
          ) : imageStatus === "running" ? (
            <PreviewPlaceholder type="running" title="AI 正在生图中..."
              subtitle={`模型：${imageModel} | 任务ID: ${(genState.imageTaskId || "").slice(0, 12)}...`} />
          ) : imageStatus === "succeeded" && imageResultUrl ? (
            <div className="rounded-xl overflow-hidden bg-gray-100 min-h-[180px] flex flex-col items-center justify-center relative group">
              <img src={imageResultUrl} alt={`Shot ${selected.shot_number}`}
                className="max-w-full max-h-[400px] object-contain" />
              <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton href={imageResultUrl} external label="打开原图" />
                <ActionButton onClick={() => copyText(imageResultUrl, "imageUrl")} label="复制链接" />
                <ActionButton onClick={() => copyText(selected.refined_image_prompt || selected.image_prompt, "previewImage")} label="复制提示词" />
                <ActionButton onClick={handleGenerateImage} label="重新生成" color="green" />
              </div>
              <div className="absolute bottom-2 left-2 bg-white/80 text-green-700 px-2 py-0.5 rounded text-xs shadow-sm">
                阿里云百炼 · {imageModel}
              </div>
            </div>
          ) : imageStatus === "failed" ? (
            <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center bg-red-50 min-h-[180px] flex flex-col items-center justify-center">
              <div className="text-red-400 text-3xl mb-2">⚠️</div>
              <h4 className="text-sm font-medium text-red-500 mb-1">生成失败</h4>
              <p className="text-xs text-red-400 mb-3">{imageError || "请重试"}</p>
              <button onClick={handleGenerateImage}
                className="border border-amber-300 text-amber-600 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-50 bg-white">
                重新生成
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 min-h-[180px] flex flex-col items-center justify-center">
              <div className="text-gray-300 text-4xl mb-3">🖼️</div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">分镜图预览区</h4>
              <p className="text-xs text-gray-300">在右侧填写提示词后点击"生成分镜图"</p>
            </div>
          )}

          {/* Task status info */}
          {latestImageTask && latestImageTask.status !== "succeeded" && latestImageTask.status !== "failed" && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>图片任务状态：</span>
              {renderTaskStatusBadge(latestImageTask)}
              {(imageStatus === "running" || imageStatus === "submitting") && (
                <button onClick={() => handleCancelPolling("image")}
                  className="text-red-500 hover:underline ml-2">
                  停止轮询
                </button>
              )}
            </div>
          )}

          {/* Video preview */}
          {videoStatus === "submitting" ? (
            <PreviewPlaceholder type="submitting" title="正在提交视频任务..." />
          ) : videoStatus === "running" ? (
            <PreviewPlaceholder type="running" title="AI 正在生成视频..."
              subtitle={`模型：${videoModel} | 任务ID: ${(genState.videoTaskId || "").slice(0, 12)}...`} />
          ) : videoStatus === "succeeded" && videoResultUrl ? (
            <div className="rounded-xl overflow-hidden bg-black min-h-[200px] flex flex-col items-center justify-center relative group">
              <video src={videoResultUrl} controls className="max-w-full max-h-[400px]" />
              <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton href={videoResultUrl} external label="打开原视频" />
                <ActionButton onClick={() => copyText(videoResultUrl, "videoUrl")} label="复制链接" />
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">
                阿里云百炼 · {videoModel}
              </div>
            </div>
          ) : videoStatus === "failed" ? (
            <div className="border-2 border-dashed border-red-300 rounded-xl p-6 text-center bg-red-50 min-h-[120px] flex flex-col items-center justify-center">
              <span className="text-red-400 text-lg">⚠️ 视频生成失败</span>
              <p className="text-xs text-red-400 mt-1">{videoError || "请重试"}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleGenerateVideo("t2v")}
                  className="border border-amber-300 text-amber-600 px-3 py-1 rounded-lg text-xs hover:bg-amber-50">
                  重试文生视频
                </button>
                <button onClick={() => handleGenerateVideo("i2v")}
                  className="border border-amber-300 text-amber-600 px-3 py-1 rounded-lg text-xs hover:bg-amber-50">
                  重试图生视频
                </button>
              </div>
            </div>
          ) : null}

          {/* Task status info for video */}
          {latestVideoTask && latestVideoTask.status !== "succeeded" && latestVideoTask.status !== "failed" && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>视频任务状态：</span>
              {renderTaskStatusBadge(latestVideoTask)}
              {(videoStatus === "running" || videoStatus === "submitting") && (
                <button onClick={() => handleCancelPolling("video")}
                  className="text-red-500 hover:underline ml-2">
                  停止轮询
                </button>
              )}
            </div>
          )}

          {/* Shot metadata */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="场景" value={selected.scene_name} />
            <Field label="出场角色" value={selected.characters} />
            <Field label="时长" value={selected.duration} />
            <Field label="运镜" value={selected.camera} />
          </div>

          {/* Editable fields */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">画面描述</label>
            <textarea value={selected.visual || ""} onChange={(e) => updateShots("visual", e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">台词 / 旁白</label>
            <textarea value={selected.dialogue || ""} onChange={(e) => updateShots("dialogue", e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">音效配乐</label>
            <input value={selected.sound || ""} onChange={(e) => updateShots("sound", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">制作备注</label>
            <textarea value={selected.notes || ""} onChange={(e) => updateShots("notes", e.target.value)}
              rows={2} placeholder="添加工艺说明、特殊要求等..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">状态</label>
            <select value={selected.status || "待生成"} onChange={(e) => updateShots("status", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
              {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存当前分镜"}
          </button>
        </div>
      </div>
    );
  }

  function renderRightPanel() {
    if (!selected) return null;

    return (
      <div className="w-80 shrink-0 overflow-auto p-5 bg-gray-50">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">提示词与生成操作</h3>

          {/* Image prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">图片提示词</label>
              <button onClick={() => copyText(selected.image_prompt, "image")}
                className="text-xs text-blue-500 hover:underline">复制</button>
            </div>
            <textarea value={selected.image_prompt || ""} onChange={(e) => updateShots("image_prompt", e.target.value)}
              rows={4} placeholder="英文图片提示词..."
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white" />
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => handlePolish("image")} disabled={polishingImage}
                className="flex-1 border border-blue-200 text-blue-600 py-1.5 rounded text-xs hover:bg-blue-50 disabled:opacity-50">
                {polishingImage ? "AI润色中..." : "AI 润色图片提示词"}
              </button>
              <button onClick={() => copyText(selected.refined_image_prompt || selected.image_prompt, "image_prompt")}
                className="border border-gray-200 text-gray-500 px-2 py-1.5 rounded text-xs hover:bg-gray-100">
                复制
              </button>
            </div>

            {/* Reference image */}
            <div className="border-t pt-3 mt-3">
              <label className="text-[10px] text-gray-400 mb-1 block">参考图片 URL（可选，用于角色/场景一致性）</label>
              <input value={selected.ref_image_url || ""} onChange={(e) => updateShots("ref_image_url", e.target.value)}
                placeholder="输入参考图片 URL..."
                className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white mb-2" />
              <button onClick={handleGenerateImage}
                disabled={genState.imageStatus === "submitting" || genState.imageStatus === "running"}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
                {genState.imageStatus === "submitting" ? "提交中..." :
                 genState.imageStatus === "running" ? "生成中..." :
                 "🎨 生成分镜图 · " + imageModel}
              </button>
              <p className="text-xs text-gray-400 mt-1 text-center">免费额度 · 同步/异步生图</p>
            </div>
          </div>

          {/* Video prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">视频提示词</label>
              <button onClick={() => copyText(selected.video_prompt, "video")}
                className="text-xs text-blue-500 hover:underline">复制</button>
            </div>
            <textarea value={selected.video_prompt || ""} onChange={(e) => updateShots("video_prompt", e.target.value)}
              rows={4} placeholder="英文视频提示词..."
              className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white" />
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => handlePolish("video")} disabled={polishingVideo}
                className="flex-1 border border-purple-200 text-purple-600 py-1.5 rounded text-xs hover:bg-purple-50 disabled:opacity-50">
                {polishingVideo ? "AI润色中..." : "AI 润色视频提示词"}
              </button>
              <button onClick={() => copyText(selected.refined_video_prompt || selected.video_prompt, "video_prompt")}
                className="border border-gray-200 text-gray-500 px-2 py-1.5 rounded text-xs hover:bg-gray-100">
                复制
              </button>
            </div>

            {/* Video generation buttons */}
            <div className="border-t pt-3 mt-3 space-y-2">
              <button onClick={() => handleGenerateVideo("t2v")}
                disabled={genState.videoStatus === "submitting" || genState.videoStatus === "running"}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
                {genState.videoStatus === "submitting" ? "提交中..." :
                 genState.videoStatus === "running" ? "视频生成中..." :
                 "🎬 文生视频 · " + videoModel}
              </button>
              <button onClick={() => handleGenerateVideo("i2v")}
                disabled={genState.videoStatus === "submitting" || genState.videoStatus === "running"}
                className="w-full border border-purple-300 text-purple-700 py-2 rounded text-xs font-medium hover:bg-purple-50 disabled:opacity-50 transition-all">
                {genState.videoStatus === "running" ? "生成中..." :
                 "🔄 图转视频 · " + videoModel}
              </button>

              {/* Running indicator */}
              {(genState.videoStatus === "running" || genState.videoStatus === "submitting") && (
                <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-700">
                    {genState.videoStatus === "submitting" ? "提交中..." : "生成中，每5秒轮询..."}
                  </span>
                  <button onClick={() => handleCancelPolling("video")}
                    className="text-xs text-red-500 hover:underline ml-auto">
                    停止
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center">阿里云百炼 · 异步生成 · 自动轮询</p>
            </div>
          </div>

          {/* Refined prompts */}
          {(selected.refined_image_prompt || selected.refined_video_prompt) && (
            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-3">润色结果（可手动修改）</h4>
              {selected.refined_image_prompt && (
                <div className="mb-3">
                  <label className="text-xs text-green-600 font-medium block mb-1">润色后图片提示词</label>
                  <textarea value={selected.refined_image_prompt}
                    onChange={(e) => updateShots("refined_image_prompt", e.target.value)}
                    rows={4} className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400 resize-none bg-white" />
                </div>
              )}
              {selected.refined_video_prompt && (
                <div>
                  <label className="text-xs text-purple-600 font-medium block mb-1">润色后视频提示词</label>
                  <textarea value={selected.refined_video_prompt}
                    onChange={(e) => updateShots("refined_video_prompt", e.target.value)}
                    rows={4} className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none bg-white" />
                </div>
              )}
            </div>
          )}

          {/* Video edit (folded) */}
          <div className="border-t pt-3">
            <button onClick={() => setShowVideoEdit(!showVideoEdit)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 w-full">
              <span className="font-medium">{showVideoEdit ? "▼" : "▶"} 高级视频编辑</span>
              <span className="text-gray-400">（实验性）</span>
            </button>
            {showVideoEdit && (
              <div className="mt-3 space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 mb-2">
                  ⚠️ WAN 视频编辑和 HappyHorse 使用免费额度，默认不自动调用。
                </p>
                <label className="text-xs text-gray-500 block mb-1">选择编辑模型</label>
                <select value={videoModel} onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white mb-2">
                  {VIDEO_MODELS.filter((m) => m.value.includes("videoedit") || m.value.includes("happyhorse")).map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <label className="text-xs text-gray-500 block mb-1">输入视频 URL</label>
                <input placeholder="粘贴待编辑视频的 URL..."
                  className="w-full border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white" />
                <button className="w-full bg-amber-600 text-white py-1.5 rounded text-xs font-medium hover:bg-amber-700 disabled:opacity-50">
                  提交视频编辑
                </button>
              </div>
            )}
          </div>

          {/* Prompt structure guide */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">提示词结构参考</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              画风 + 景别 + 主体动作 + 背景环境 + 光线氛围 + 镜头语言
            </p>
          </div>
        </div>

        {/* Message toast */}
        {message && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  // ===== Main render =====
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
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 280px)" }}>
      {/* Three-column layout */}
      <div className="flex flex-1 bg-white border rounded-xl overflow-hidden min-h-0">
        {renderShotList()}
        {renderCenterPreview()}
        {renderRightPanel()}
      </div>

      {/* Bottom: Config bar */}
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
                <option key={m.value} value={m.value}>{m.label}</option>
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

// ===== Sub-components =====

function Field({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

function ActionButton({ label, onClick, href, external, color }) {
  const cls = `px-2.5 py-1 rounded text-xs shadow-sm border transition-all ${
    color === "green" ? "bg-white/90 text-green-600 hover:bg-white" :
    "bg-white/90 text-gray-700 hover:bg-white"
  }`;
  if (href && external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
  }
  return <button onClick={onClick} className={cls}>{label}</button>;
}

function PreviewPlaceholder({ type, title, subtitle }) {
  const isSubmitting = type === "submitting";
  const colors = isSubmitting
    ? { border: "border-blue-300", bg: "bg-blue-50/50", text: "text-blue-600", spinner: "border-blue-600" }
    : { border: "border-purple-300", bg: "bg-purple-50/50", text: "text-purple-600", spinner: "border-purple-600" };

  return (
    <div className={`border-2 border-dashed ${colors.border} rounded-xl p-8 text-center ${colors.bg} min-h-[180px] flex flex-col items-center justify-center`}>
      <div className={`w-8 h-8 border-2 ${colors.spinner} border-t-transparent rounded-full animate-spin mb-3`} />
      <p className={`text-sm font-medium ${colors.text}`}>{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
