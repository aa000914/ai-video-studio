"use client";

import { useState, useEffect, useRef } from "react";
import PromptBuilder from "./PromptBuilder";
import GenerationPanel from "./GenerationPanel";

const TASK_STATUS_CONFIG = {
  queued: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600" },
  pending: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600" },
  running: { label: "生成中", bg: "bg-blue-100", text: "text-blue-700" },
  succeeded: { label: "成功", bg: "bg-green-100", text: "text-green-700" },
  failed: { label: "失败", bg: "bg-red-100", text: "text-red-700" },
  cancelled: { label: "已取消", bg: "bg-gray-100", text: "text-gray-500" },
};

export default function ShotDetailDrawer({ shot, projectId, onClose, onUpdated, shotsTotal = 0 }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [polishingImage, setPolishingImage] = useState(false);
  const [polishingVideo, setPolishingVideo] = useState(false);
  const [message, setMessage] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [viewMode, setViewMode] = useState("detail"); // detail | generate
  const pollingRef = useRef(null);

  useEffect(() => {
    if (shot) {
      setForm({
        shot_number: shot.shot_number || "",
        duration: shot.duration || "",
        scene_name: shot.scene_name || "",
        characters: shot.characters || "",
        visual: shot.visual || "",
        camera: shot.camera || "",
        dialogue: shot.dialogue || "",
        sound: shot.sound || "",
        image_prompt: shot.image_prompt || "",
        video_prompt: shot.video_prompt || "",
        refined_image_prompt: shot.refined_image_prompt || "",
        refined_video_prompt: shot.refined_video_prompt || "",
        negative_prompt: shot.negative_prompt || "",
        selected_image_url: shot.selected_image_url || shot.image_url || "",
        selected_video_url: shot.selected_video_url || shot.video_url || "",
        status: shot.status || "待生成",
        notes: shot.notes || "",
      });
    }
  }, [shot]);

  useEffect(() => {
    if (!shot?.id) return;
    loadAssets();
    loadTasks();
    loadSubjects();
  }, [shot?.id]);

  async function loadSubjects() {
    try {
      const [charRes, sceneRes] = await Promise.all([
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
      ]);
      const chars = (await charRes.json()).data || [];
      const scs = (await sceneRes.json()).data || [];
      setSubjects([
        ...chars.map((c) => ({ ...c, type: c.subject_type || "character" })),
        ...scs.map((s) => ({ ...s, type: s.subject_type || "scene" })),
      ]);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  async function loadAssets() {
    try {
      const [tasksRes, assetsRes] = await Promise.all([
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
        fetch(`/api/generated-assets?project_id=${projectId}`),
      ]);
      const tasksJson = await tasksRes.json();
      const assetsJson = await assetsRes.json();

      const shotTasks = (tasksJson.data || []).filter((t) => t.shot_id === shot.id);
      setTasks(shotTasks);

      const projectAssets = assetsJson.data || [];
      setAssets(projectAssets.filter((a) => a.shot_id === shot.id));

      // Start polling for running tasks
      const running = shotTasks.filter((t) => t.status === "running" || t.status === "pending");
      if (running.length > 0) startPolling(running);
    } catch { /* ignore */ }
  }

  function startPolling(runningTasks) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      let changed = false;
      for (const t of runningTasks) {
        try {
          const res = await fetch(`/api/generation/status?id=${t.id}`);
          const json = await res.json();
          if (json.status === "succeeded" || json.status === "failed") changed = true;
        } catch { /* continue */ }
      }
      if (changed) { loadAssets(); if (onUpdated) onUpdated(); }
    }, 5000);
  }

  function update(field, value) { setForm((prev) => ({ ...prev, [field]: value })); }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/shots/${shot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      showMessage("保存成功", "success");
      if (onUpdated) onUpdated();
    } catch (err) { showMessage(err.message, "error"); }
    finally { setSaving(false); }
  }

  function showMessage(text, type) { setMessage({ text, type }); setTimeout(() => setMessage(null), 3000); }

  async function handlePolishPrompt(field, rawPrompt) {
    if (!rawPrompt?.trim()) { showMessage("请先生成或填写 Prompt", "error"); return; }
    try {
      const res = await fetch("/api/polish-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: field, prompt: rawPrompt, shot: { shot_number: shot.shot_number, scene_name: shot.scene_name, characters: shot.characters } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "润色失败");
      if (json.data?.polished) { update(field === "image" ? "refined_image_prompt" : "refined_video_prompt", json.data.polished); showMessage("润色完成", "success"); }
    } catch (err) { showMessage(err.message, "error"); }
  }

  async function handlePolish(field) {
    const source = field === "image" ? (form.refined_image_prompt || form.image_prompt) : (form.refined_video_prompt || form.video_prompt);
    if (!source?.trim()) { showMessage("请先填写提示词", "error"); return; }

    if (field === "image") setPolishingImage(true); else setPolishingVideo(true);
    try {
      const res = await fetch("/api/polish-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: field, prompt: source, shot: { shot_number: shot.shot_number, scene_name: shot.scene_name, characters: shot.characters, visual: shot.visual, camera: shot.camera } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "润色失败");
      if (json.data?.polished) {
        const target = field === "image" ? "refined_image_prompt" : "refined_video_prompt";
        update(target, json.data.polished);
        showMessage("润色完成", "success");
      }
    } catch (err) { showMessage(err.message, "error"); }
    finally {
      if (field === "image") setPolishingImage(false); else setPolishingVideo(false);
    }
  }

  async function handleGenerateImage() {
    const prompt = form.refined_image_prompt || form.image_prompt;
    if (!prompt?.trim()) { showMessage("请先填写图片提示词", "error"); return; }
    showMessage("已提交生图任务", "success");

    try {
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, shotId: shot.id, type: "image", prompt: prompt.trim(), size: "1280*720" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      loadAssets();
      if (onUpdated) onUpdated();
    } catch (err) { showMessage(err.message, "error"); }
  }

  async function handleGenerateVideo() {
    const imageUrl = form.selected_image_url || shot.image_url;
    if (!imageUrl) { showMessage("请先生成首帧图", "error"); return; }
    const prompt = form.refined_video_prompt || form.video_prompt || "Generate video from this image";
    showMessage("已提交视频生成任务", "success");

    try {
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, shotId: shot.id, type: "i2v", prompt: prompt.trim(), imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      loadAssets();
      if (onUpdated) onUpdated();
    } catch (err) { showMessage(err.message, "error"); }
  }

  async function handleSelectAsset(asset) {
    const isImage = (asset.type || "").includes("image");
    const assetIdField = isImage ? "selected_image_asset_id" : "selected_video_asset_id";
    const urlField = isImage ? "selected_image_url" : "selected_video_url";

    // 1. Update shot: set selected_image_asset_id + selected_image_url
    try {
      await fetch(`/api/shots/${shot.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [assetIdField]: asset.id, [urlField]: asset.url }),
      });
    } catch { /* ignore */ }

    // 2. Mark this asset as selected
    try {
      await fetch(`/api/generated-assets/${asset.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_selected: isImage, is_final: !isImage }),
      });
    } catch { /* ignore */ }

    // 3. Unselect other assets of same type for this shot
    try {
      const res = await fetch(`/api/generated-assets?project_id=${projectId}`);
      const json = await res.json();
      const sameType = (json.data || []).filter((a) => a.shot_id === shot.id && a.type === asset.type && a.id !== asset.id);
      for (const a of sameType) {
        await fetch(`/api/generated-assets/${a.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_selected: isImage ? false : a.is_selected, is_final: !isImage ? false : a.is_final }),
        });
      }
    } catch { /* ignore */ }

    update(urlField, asset.url);
    update(assetIdField, asset.id);
    loadAssets();
    showMessage(`已选为${isImage ? "首帧图" : "Final 视频"}`, "success");
  }

  function copyText(text) {
    try { navigator.clipboard.writeText(text || ""); showMessage("已复制", "success"); }
    catch { /* ignore */ }
  }

  // Candidates from generated_assets (data source of truth)
  const imageAssets = assets.filter((a) => (a.type || "").includes("image"));
  const videoAssets = assets.filter((a) => (a.type || "").includes("video") || a.type === "video");
  const runningTasks = tasks.filter((t) => t.status === "running" || t.status === "pending");

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 z-10 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">镜头 #{form.shot_number}</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-6 pb-32">
          {message && (
            <div className={`px-3 py-2 rounded-lg text-xs ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message.text}
            </div>
          )}

          {/* Section 1: Shot Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">镜头信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="场景" value={form.scene_name} onChange={(v) => update("scene_name", v)} />
              <Field label="时长" value={form.duration} onChange={(v) => update("duration", v)} />
              <Field label="角色" value={form.characters} onChange={(v) => update("characters", v)} />
              <Field label="运镜" value={form.camera} onChange={(v) => update("camera", v)} />
              <Field label="状态" value={form.status} onChange={(v) => update("status", v)} type="select" options={["待生成","已生成图","已生成视频","需重做","已通过"]} />
            </div>
            <div className="mt-3 space-y-3">
              <TextArea label="画面描述" value={form.visual} onChange={(v) => update("visual", v)} rows={2} />
              <TextArea label="台词/旁白" value={form.dialogue} onChange={(v) => update("dialogue", v)} rows={2} />
              <TextArea label="音效配乐" value={form.sound} onChange={(v) => update("sound", v)} rows={1} />
            </div>
          </div>

          <hr />

          {/* Section 2: Prompts with PromptBuilder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Prompt Builder</h3>
            </div>
            {/* Image Prompt */}
            <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-700 mb-2">🖼 Image Prompt</p>
              <PromptBuilder type="image" subjects={subjects}
                initialPrompt={form.refined_image_prompt || form.image_prompt || ""}
                shot={shot}
                onChange={(v) => update("image_prompt", v)}
                onPolish={(v) => handlePolishPrompt("image", v)} />
            </div>
            {/* Video Prompt */}
            <div className="mb-4 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
              <p className="text-xs font-medium text-purple-700 mb-2">🎬 Video Prompt</p>
              <PromptBuilder type="video" subjects={subjects}
                initialPrompt={form.refined_video_prompt || form.video_prompt || ""}
                shot={shot}
                onChange={(v) => update("video_prompt", v)}
                onPolish={(v) => handlePolishPrompt("video", v)} />
            </div>
            {/* Audio Prompt (reserved) */}
            <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
              <p className="text-xs font-medium text-amber-700 mb-2">🔊 Audio Prompt （预留）</p>
              <textarea value={form.audio_prompt || ""} onChange={(e) => update("audio_prompt", e.target.value)}
                rows={2} placeholder="对白 + 音色 + 环境音 + BGM + 情绪..."
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none bg-white" />
            </div>
            {/* Negative Prompt */}
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Negative Prompt</label>
              <textarea value={form.negative_prompt || ""} onChange={(e) => update("negative_prompt", e.target.value)}
                rows={2} placeholder="不想出现的元素..."
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-400 resize-none bg-white" />
            </div>
          </div>

          <hr />

          {/* Section 3: Input Materials */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">参考素材</h3>
            <div className="space-y-2">
              <Field label="首帧图 URL" value={form.selected_image_url} onChange={(v) => update("selected_image_url", v)} />
              <Field label="最终视频 URL" value={form.selected_video_url} onChange={(v) => update("selected_video_url", v)} />
              <Field label="参考图 URL" value={shot.ref_image_url || ""} onChange={() => {}} />
            </div>
            {(form.selected_image_url) && (
              <div className="mt-3 rounded-lg overflow-hidden bg-gray-100 h-48">
                <img src={form.selected_image_url} alt="Selected frame" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          <hr />

          {/* Section 4: Generation Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">生成结果</h3>
              {runningTasks.length > 0 && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{runningTasks.length} 进行中</span>
              )}
            </div>

            {imageAssets.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">图片候选 ({imageAssets.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {imageAssets.map((a) => (
                    <div key={a.id} className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      (a.id === shot.selected_image_asset_id || a.is_selected) ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`} onClick={() => handleSelectAsset({ id: a.id, type: a.type, url: a.url })}>
                      <img src={a.url} alt="" className="w-full h-32 object-cover" />
                      <div className="p-1.5 text-[10px] text-gray-500 flex items-center justify-between">
                        <span>{a.model || a.provider || "—"}</span>
                        {(a.id === shot.selected_image_asset_id || a.is_selected) && <span className="text-blue-500 font-medium">已选中</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videoAssets.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">视频候选 ({videoAssets.length})</h4>
                <div className="space-y-2">
                  {videoAssets.map((a) => (
                    <div key={a.id} className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                      (a.id === shot.final_video_asset_id || a.is_final) ? "border-purple-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                    }`} onClick={() => handleSelectAsset({ id: a.id, type: a.type, url: a.url })}>
                      <video src={a.url} controls className="w-full h-32 object-cover rounded mb-1" />
                      <div className="text-[10px] text-gray-500 flex items-center justify-between">
                        <span>{a.model || a.provider || "—"} · {a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : ""}</span>
                        {(a.id === shot.final_video_asset_id || a.is_final) && <span className="text-purple-500 font-medium">Final</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {runningTasks.length > 0 && (
              <div className="mt-3 space-y-1">
                <h4 className="text-xs font-medium text-gray-500 mb-1">任务状态</h4>
                {runningTasks.map((t) => {
                  const sc = TASK_STATUS_CONFIG[t.status] || TASK_STATUS_CONFIG.pending;
                  return (
                    <div key={t.id} className={`${sc.bg} ${sc.text} px-3 py-1.5 rounded text-xs flex items-center gap-2`}>
                      <span>{(t.type === "image" ? "🖼" : "🎬")} {sc.label}</span>
                      <span className="text-gray-400">{t.model || "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {imageAssets.length === 0 && videoAssets.length === 0 && runningTasks.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">暂无生成结果，点击下方按钮开始生成</p>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        {viewMode === "detail" ? (
          <div className="fixed bottom-0 bg-white border-t p-4 flex gap-2 w-full max-w-lg">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={() => setViewMode("generate")}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
              ⚡ 生成面板
            </button>
          </div>
        ) : (
          <div className="fixed bottom-0 bg-white border-t p-4 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">🚀 生成设置</h3>
              <button onClick={() => setViewMode("detail")}
                className="text-xs text-gray-500 hover:text-gray-700">&larr; 返回编辑</button>
            </div>
            <GenerationPanel shot={shot} projectId={projectId} onGenerated={loadAssets} shotsTotal={shotsTotal} />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type, options }) {
  if (type === "select" && options) {
    return (
      <div>
        <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-0.5 block">{label}</label>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows || 2}
        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
    </div>
  );
}
