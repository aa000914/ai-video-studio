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

export default function ShotEditorPanel({ projectId }) {
  const [shots, setShots] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedField, setCopiedField] = useState("");

  const selected = shots[selectedIdx];

  useEffect(() => { loadShots(); }, [projectId]);

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
      const res = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: `请将以下简短提示词润色成完整的${field === "image" ? "图片" : "视频"}生成提示词。\n\n要求：\n1. 如果是图片提示词，结构为：画风 + 景别 + 主体动作 + 背景环境 + 光线氛围 + 镜头语言\n2. 如果是视频提示词，在上述基础上增加运动描述（摄像机运动、主体动作）\n3. 只输出润色后的英文提示词，不要额外解释\n4. 输出必须是一段完整的英文\n\n原始提示词：${sourceText}`,
          projectId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "润色失败");

      if (json.data?.raw) {
        updateField(field === "image" ? "refined_image_prompt" : "refined_video_prompt", json.data.raw.trim());
      } else if (json.data?.summary) {
        updateField(field === "image" ? "refined_image_prompt" : "refined_video_prompt", json.data.summary.trim());
      }
      setMessage("润色完成");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) { setMessage("润色失败: " + err.message); }
    finally { setPolishing(false); }
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
    <div className="flex gap-0 h-full min-h-[600px] bg-white border rounded-xl overflow-hidden">
      {/* Left: Shot list */}
      <div className="w-56 border-r bg-gray-50 shrink-0 overflow-auto">
        <div className="p-3 border-b bg-white">
          <h3 className="text-xs font-semibold text-gray-500 uppercase">分镜列表</h3>
        </div>
        {shots.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSelectedIdx(i)}
            className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
              i === selectedIdx ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">#{s.shot_number}</span>
              <span className={`text-xs px-1.5 py-0 rounded ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                {s.status || "待生成"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{s.scene_name || "—"}</p>
          </button>
        ))}
      </div>

      {/* Center: Shot detail */}
      <div className="flex-1 overflow-auto p-5 border-r">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                镜头 #{selected.shot_number} <span className="text-gray-400 font-normal text-sm ml-2">{selected.duration}</span>
              </h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[selected.status] || "bg-gray-100 text-gray-600"}`}>
                {selected.status || "待生成"}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">场景</label>
              <p className="text-sm text-gray-900">{selected.scene_name || "—"}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">出场角色</label>
              <p className="text-sm text-gray-900">{selected.characters || "—"}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">画面描述</label>
              <textarea
                value={selected.visual || ""}
                onChange={(e) => updateField("visual", e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">台词 / 旁白</label>
              <textarea
                value={selected.dialogue || ""}
                onChange={(e) => updateField("dialogue", e.target.value)}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">镜头运动</label>
              <input
                value={selected.camera || ""}
                onChange={(e) => updateField("camera", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">音效配乐</label>
              <input
                value={selected.sound || ""}
                onChange={(e) => updateField("sound", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">状态</label>
              <select
                value={selected.status || "待生成"}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>
        )}
      </div>

      {/* Right: Prompt editor */}
      <div className="w-80 shrink-0 overflow-auto p-5 bg-gray-50">
        {selected && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">提示词编辑区</h3>

            {/* Image prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">图片提示词</label>
                <button
                  onClick={() => copyText(selected.image_prompt, "image")}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {copiedField === "image" ? "已复制" : "复制"}
                </button>
              </div>
              <textarea
                value={selected.image_prompt || ""}
                onChange={(e) => updateField("image_prompt", e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white"
                placeholder="英文图片提示词..."
              />
              <button
                onClick={() => handlePolish("image")}
                disabled={polishing}
                className="mt-1.5 w-full border border-blue-200 text-blue-600 py-1 rounded text-xs hover:bg-blue-50 disabled:opacity-50"
              >
                {polishing ? "AI润色中..." : "AI 润色图片提示词"}
              </button>
            </div>

            {/* Video prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">视频提示词</label>
                <button
                  onClick={() => copyText(selected.video_prompt, "video")}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {copiedField === "video" ? "已复制" : "复制"}
                </button>
              </div>
              <textarea
                value={selected.video_prompt || ""}
                onChange={(e) => updateField("video_prompt", e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none bg-white"
                placeholder="英文视频提示词..."
              />
              <button
                onClick={() => handlePolish("video")}
                disabled={polishing}
                className="mt-1.5 w-full border border-purple-200 text-purple-600 py-1 rounded text-xs hover:bg-purple-50 disabled:opacity-50"
              >
                {polishing ? "AI润色中..." : "AI 润色视频提示词"}
              </button>
            </div>

            {/* Refined prompts */}
            {(selected.refined_image_prompt || selected.refined_video_prompt) && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3">润色结果</h4>
                {selected.refined_image_prompt && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-green-600 font-medium">润色后图片提示词</label>
                      <button onClick={() => copyText(selected.refined_image_prompt, "refined_image")}
                        className="text-xs text-blue-500 hover:underline">
                        {copiedField === "refined_image" ? "已复制" : "复制"}
                      </button>
                    </div>
                    <textarea
                      value={selected.refined_image_prompt}
                      onChange={(e) => updateField("refined_image_prompt", e.target.value)}
                      rows={4}
                      className="w-full border border-green-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-400 resize-none bg-white"
                    />
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
                    <textarea
                      value={selected.refined_video_prompt}
                      onChange={(e) => updateField("refined_video_prompt", e.target.value)}
                      rows={4}
                      className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none bg-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Prompt structure guide */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4">
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
  );
}
