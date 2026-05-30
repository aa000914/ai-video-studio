"use client";

import { useState, useEffect } from "react";

export default function SimpleShotEditModal({ shot, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!shot) return;
    setForm({
      title: shot.title || "",
      scene_name: shot.scene_name || "",
      characters: shot.characters || "",
      visual: shot.visual || shot.story_text || "",
      camera: shot.camera || shot.camera_angle || "",
      dialogue: shot.dialogue || "",
      sound: shot.sound || "",
      video_prompt: shot.visual || shot.video_prompt || shot.refined_video_prompt || "",
    });
  }, [shot]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      // 1. Local state update first
      onSave?.({ ...shot, ...form });

      // 2. Save to API
      const res = await fetch(`/api/shots/${shot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("API save failed");
      setMsg("已保存修改");
      setTimeout(() => onClose?.(), 500);
    } catch (err) {
      console.error(err);
      setMsg("本地已更新，但保存到数据库失败");
      setTimeout(() => onClose?.(), 1000);
    }
    finally { setSaving(false); }
  }

  if (!shot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-900">编辑镜头 #{shot.shot_number}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
          {msg && <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs">{msg}</div>}

          <Field label="场景" value={form.scene_name} onChange={(v) => update("scene_name", v)} />
          <Field label="角色" value={form.characters} onChange={(v) => update("characters", v)} />
          <Field label="运镜" value={form.camera} onChange={(v) => update("camera", v)} />
          <TextArea label="画面描述" value={form.visual} onChange={(v) => update("visual", v)} rows={3} />
          <TextArea label="台词" value={form.dialogue} onChange={(v) => update("dialogue", v)} rows={2} />
          <Field label="音效" value={form.sound} onChange={(v) => update("sound", v)} />
          <TextArea label="图生视频提示词" value={form.video_prompt} onChange={(v) => update("video_prompt", v)}
            rows={3} placeholder="该内容用于生成视频，可根据需要修改" />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            取消
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows || 3} placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
    </div>
  );
}
