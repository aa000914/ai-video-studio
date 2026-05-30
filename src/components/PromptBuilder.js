"use client";

import { useState, useEffect } from "react";

/**
 * PromptBuilder — 结构化 Prompt 构建器
 *
 * 支持 image / video / audio 三种类型，按公式组装 Prompt。
 * 支持 @主体 插入。
 */
export default function PromptBuilder({ type, subjects = [], initialPrompt = "", shot = {}, onChange, onPolish }) {
  const [mode, setMode] = useState("structured"); // structured | freeform
  const [fields, setFields] = useState({
    scene: shot.scene_name || "",
    subject: shot.characters || "",
    action: "",
    camera: shot.camera || "",
    background: "",
    style: "",
    emotion: "",
    dialogue: shot.dialogue || "",
    voice: "",
    sfx: "",
    bgm: "",
  });
  const [rawPrompt, setRawPrompt] = useState(initialPrompt || "");
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  useEffect(() => {
    if (initialPrompt) setRawPrompt(initialPrompt);
  }, [initialPrompt]);

  function buildPrompt() {
    const { scene, subject, action, camera, background, style, emotion, dialogue, voice, sfx, bgm } = fields;
    switch (type) {
      case "image":
        return [style, scene, subject, action, camera, background, "high quality, photorealistic, cinematic lighting"].filter(Boolean).join(", ");
      case "video":
        return [style, subject && `${subject} ${action || "performing action"}`, camera && `camera: ${camera}`, background, emotion, "smooth motion, stable, high quality"].filter(Boolean).join(", ");
      case "audio":
        return [dialogue && `Dialogue: ${dialogue}`, voice && `Voice: ${voice}`, sfx && `SFX: ${sfx}`, bgm && `BGM: ${bgm}`, emotion].filter(Boolean).join("; ");
      default: return "";
    }
  }

  function handleStructuredChange() {
    const prompt = buildPrompt();
    setRawPrompt(prompt);
    onChange?.(prompt);
  }

  const filteredSubjects = subjects.filter((s) =>
    !subjectSearch || (s.name || "").toLowerCase().includes(subjectSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMode("structured")}
          className={`text-xs px-2.5 py-1 rounded-full ${mode === "structured" ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-gray-100 text-gray-500"}`}>
          结构化
        </button>
        <button onClick={() => setMode("freeform")}
          className={`text-xs px-2.5 py-1 rounded-full ${mode === "freeform" ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-gray-100 text-gray-500"}`}>
          自由编辑
        </button>
        <button onClick={() => setShowSubjectPicker(!showSubjectPicker)}
          className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
          @ 插入主体
        </button>
      </div>

      {/* Subject picker popup */}
      {showSubjectPicker && (
        <div className="border border-purple-200 rounded-lg bg-white p-3 shadow-lg max-h-40 overflow-y-auto">
          <input value={subjectSearch} onChange={(e) => setSubjectSearch(e.target.value)} placeholder="搜索主体..."
            className="w-full border rounded px-2 py-1 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-purple-400" />
          <div className="space-y-0.5">
            {filteredSubjects.map((s) => (
              <button key={s.id} onClick={() => {
                const mention = `@${s.name}`;
                setRawPrompt((prev) => prev ? `${prev} ${mention}` : mention);
                setShowSubjectPicker(false); setSubjectSearch("");
                onChange?.(rawPrompt ? `${rawPrompt} ${mention}` : mention);
              }}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-purple-50 flex items-center gap-2">
                <span className="text-base">{s.type === "character" ? "👤" : s.type === "scene" ? "🏛" : s.type === "prop" ? "🗿" : s.type === "style" ? "🎨" : s.type === "voice" ? "🎙️" : "📎"}</span>
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-400 text-[10px]">{s.type}</span>
              </button>
            ))}
            {filteredSubjects.length === 0 && <p className="text-xs text-gray-400 text-center py-2">无匹配主体</p>}
          </div>
        </div>
      )}

      {/* Structured fields */}
      {mode === "structured" && (
        <div className="grid grid-cols-2 gap-2">
          <MiniField label="场景" value={fields.scene} onChange={(v) => { setFields((p) => ({ ...p, scene: v })); }} />
          <MiniField label="主体" value={fields.subject} onChange={(v) => { setFields((p) => ({ ...p, subject: v })); }} />
          {type !== "audio" && <MiniField label="动作" value={fields.action} onChange={(v) => { setFields((p) => ({ ...p, action: v })); }} />}
          {type !== "audio" && <MiniField label="运镜" value={fields.camera} onChange={(v) => { setFields((p) => ({ ...p, camera: v })); }} />}
          {type !== "audio" && <MiniField label="背景" value={fields.background} onChange={(v) => { setFields((p) => ({ ...p, background: v })); }} />}
          <MiniField label="画风" value={fields.style} onChange={(v) => { setFields((p) => ({ ...p, style: v })); }} />
          <MiniField label="情绪" value={fields.emotion} onChange={(v) => { setFields((p) => ({ ...p, emotion: v })); }} />
          {type === "audio" && <MiniField label="对白" value={fields.dialogue} onChange={(v) => { setFields((p) => ({ ...p, dialogue: v })); }} />}
          {type === "audio" && <MiniField label="音色" value={fields.voice} onChange={(v) => { setFields((p) => ({ ...p, voice: v })); }} />}
          {type === "audio" && <MiniField label="音效" value={fields.sfx} onChange={(v) => { setFields((p) => ({ ...p, sfx: v })); }} />}
          {type === "audio" && <MiniField label="BGM" value={fields.bgm} onChange={(v) => { setFields((p) => ({ ...p, bgm: v })); }} />}
        </div>
      )}

      {/* Raw prompt */}
      <textarea value={rawPrompt} onChange={(e) => { setRawPrompt(e.target.value); onChange?.(e.target.value); }}
        rows={4} placeholder={`${type === "image" ? "Image" : type === "video" ? "Video" : "Audio"} prompt...`}
        className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none bg-white" />

      {/* Action buttons */}
      <div className="flex gap-2">
        {mode === "structured" && (
          <button onClick={handleStructuredChange}
            className="border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-50 transition-colors">
            生成 Prompt
          </button>
        )}
        {onPolish && (
          <button onClick={() => onPolish(rawPrompt)}
            className="border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-50 transition-colors">
            ✨ AI 润色
          </button>
        )}
        <button onClick={() => { try { navigator.clipboard.writeText(rawPrompt); } catch {} }}
          className="border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition-colors">
          复制
        </button>
      </div>
    </div>
  );
}

function MiniField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 block mb-0.5">{label}</label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
    </div>
  );
}
