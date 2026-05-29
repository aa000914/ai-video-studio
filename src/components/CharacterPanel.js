"use client";

import { useState, useEffect } from "react";
import EditModal from "./EditModal";

const FIELDS = [
  { key: "name", label: "角色名称" },
  { key: "role", label: "身份" },
  { key: "age", label: "年龄" },
  { key: "personality", label: "性格" },
  { key: "appearance", label: "外貌描述", type: "textarea" },
  { key: "costume", label: "服装", type: "textarea" },
  { key: "prompt", label: "角色一致性提示词", type: "textarea" },
  { key: "prohibited_changes", label: "禁止变化点", type: "textarea" },
  { key: "prompt_front", label: "正面提示词", type: "textarea" },
  { key: "prompt_back", label: "背面提示词", type: "textarea" },
  { key: "prompt_overhead", label: "俯视提示词", type: "textarea" },
  { key: "notes", label: "备注", type: "textarea" },
];

export default function CharacterPanel({ projectId }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Per-character image generation
  const [genStates, setGenStates] = useState({}); // { [charId]: "idle"|"generating"|"done"|"error" }
  const [genImages, setGenImages] = useState({}); // { [charId]: "url" }
  const [genErrors, setGenErrors] = useState({}); // { [charId]: "error msg" }

  useEffect(() => { loadCharacters(); }, [projectId]);

  async function loadCharacters() {
    setLoading(true);
    try {
      const res = await fetch(`/api/characters?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) setCharacters(json.data || []);
    } catch (err) {
      setMessage("加载失败: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch("/api/generate-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadCharacters();
    } catch (err) {
      setMessage("错误: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(data) {
    if (editItem) {
      const res = await fetch(`/api/characters/${editItem.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
    } else {
      const res = await fetch("/api/characters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, project_id: projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
    }
    await loadCharacters();
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个角色吗？")) return;
    try {
      await fetch(`/api/characters/${id}`, { method: "DELETE" });
      await loadCharacters();
    } catch (err) { setMessage("删除失败: " + err.message); }
  }

  async function copyCharPrompt(c) {
    const text = [
      `【角色：${c.name}】`,
      `身份：${c.role || "—"}  |  年龄：${c.age || "—"}`,
      `性格：${c.personality || "—"}`,
      `外貌：${c.appearance || "—"}`,
      `服装：${c.costume || "—"}`,
      ``,
      `🎨 角色一致性提示词：`,
      c.prompt || "—",
      ``,
      `🚫 禁止变化点：`,
      c.prohibited_changes || "—",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  async function handleGenerateCharImage(c) {
    const prompt = c.prompt_front || c.prompt;
    if (!prompt?.trim()) {
      setMessage("请先填写角色提示词");
      return;
    }
    setGenStates((prev) => ({ ...prev, [c.id]: "generating" }));
    setGenErrors((prev) => ({ ...prev, [c.id]: "" }));
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size: "1024*1024" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      if (data.results?.[0]?.url) {
        setGenImages((prev) => ({ ...prev, [c.id]: data.results[0].url }));
        setGenStates((prev) => ({ ...prev, [c.id]: "done" }));
      } else if (data.task_id) {
        // Async mode — poll
        const taskId = data.task_id;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await fetch(`/api/media-task?task_id=${taskId}`);
          const pollData = await poll.json();
          if (pollData.status === "SUCCEEDED" && pollData.results?.[0]?.url) {
            setGenImages((prev) => ({ ...prev, [c.id]: pollData.results[0].url }));
            setGenStates((prev) => ({ ...prev, [c.id]: "done" }));
            return;
          }
          if (pollData.status === "FAILED") throw new Error(pollData.error || "生成失败");
        }
        throw new Error("生成超时");
      }
    } catch (err) {
      setGenErrors((prev) => ({ ...prev, [c.id]: err.message }));
      setGenStates((prev) => ({ ...prev, [c.id]: "error" }));
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>;

  return (
    <div className="space-y-4">
      {message && <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

      <div className="flex gap-3">
        <button onClick={() => { setEditItem(null); setShowAdd(true); }}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          手动添加角色
        </button>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
          {generating ? "AI生成中..." : "从剧本生成角色"}
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">暂无角色数据</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {characters.map((c) => (
            <div key={c.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{c.name}</h4>
                    <p className="text-xs text-gray-500">{c.role}{c.age && ` · ${c.age}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditItem(c); setShowAdd(true); }}
                    className="text-blue-600 text-xs hover:underline">编辑</button>
                  <button onClick={() => handleDelete(c.id)}
                    className="text-red-600 text-xs hover:underline">删除</button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {c.personality && <Row label="性格" value={c.personality} />}
                {c.appearance && <Row label="外貌" value={c.appearance} />}
                {c.costume && <Row label="服装" value={c.costume} />}
              </div>

              {c.prompt && (
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">角色一致性提示词</p>
                  <p className="text-xs text-blue-800 leading-relaxed font-mono">{c.prompt}</p>
                  <p className="text-xs text-blue-400 mt-2 italic">用于保持后续分镜中角色一致性</p>
                </div>
              )}

              {c.prohibited_changes && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">禁止变化点</p>
                  <p className="text-xs text-red-800 leading-relaxed">{c.prohibited_changes}</p>
                </div>
              )}

              {c.prompt_front && (
                <div className="mt-2 bg-gray-50 border rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">正面提示词</p>
                  <p className="text-xs text-gray-700 font-mono">{c.prompt_front}</p>
                </div>
              )}

              {/* Subject image */}
              {genImages[c.id] ? (
                <div className="mt-3 rounded-lg overflow-hidden bg-gray-100 relative">
                  <img src={genImages[c.id]} alt={c.name} className="w-full h-48 object-cover" />
                  <button
                    onClick={() => { setGenImages((prev) => ({ ...prev, [c.id]: "" })); setGenStates((prev) => ({ ...prev, [c.id]: "idle" })); }}
                    className="absolute top-1.5 right-1.5 bg-white/80 text-gray-600 px-2 py-0.5 rounded text-[10px] hover:bg-white"
                  >
                    重生成
                  </button>
                </div>
              ) : genStates[c.id] === "generating" ? (
                <div className="mt-3 border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50/50">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  <p className="text-xs text-blue-600">AI 生成中...</p>
                </div>
              ) : genStates[c.id] === "error" ? (
                <div className="mt-3 border-2 border-dashed border-red-200 rounded-lg p-3 text-center bg-red-50">
                  <p className="text-xs text-red-500">{genErrors[c.id] || "生成失败"}</p>
                  <button onClick={() => handleGenerateCharImage(c)}
                    className="mt-1 text-xs text-blue-600 hover:underline">重试</button>
                </div>
              ) : (
                <div className="mt-3 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-gray-300 text-2xl mb-1">🖼</div>
                  <p className="text-xs text-gray-400">主体图占位区域</p>
                  <p className="text-[10px] text-gray-300 mt-1">正面单人 · 背景干净 · 五官清晰</p>
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <button onClick={() => copyCharPrompt(c)}
                  className="flex-1 border border-blue-200 text-blue-600 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                  {copiedId === c.id ? "已复制" : "复制提示词"}
                </button>
                <button
                  onClick={() => handleGenerateCharImage(c)}
                  disabled={genStates[c.id] === "generating"}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all">
                  {genStates[c.id] === "generating" ? "生成中..." : "生成角色图"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <EditModal title={editItem ? "编辑角色" : "添加角色"} fields={FIELDS}
          initialData={editItem} onClose={() => { setShowAdd(false); setEditItem(null); }} onSave={handleSave} />
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0 w-10 text-xs">{label}</span>
      <span className="text-gray-700 text-xs">{value}</span>
    </div>
  );
}
