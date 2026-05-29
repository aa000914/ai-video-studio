"use client";

import { useState, useEffect } from "react";
import EditModal from "./EditModal";

const FIELDS = [
  { key: "name", label: "场景名称" },
  { key: "location", label: "地点" },
  { key: "time_period", label: "时代" },
  { key: "description", label: "空间描述", type: "textarea" },
  { key: "lighting", label: "光线" },
  { key: "style", label: "风格" },
  { key: "prompt", label: "场景提示词", type: "textarea" },
  { key: "prohibited_elements", label: "禁止元素", type: "textarea" },
  { key: "prompt_front", label: "主视图提示词", type: "textarea" },
  { key: "prompt_back", label: "反打视图提示词", type: "textarea" },
  { key: "prompt_overhead", label: "俯视图提示词", type: "textarea" },
  { key: "notes", label: "备注", type: "textarea" },
];

export default function ScenePanel({ projectId }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const [genStates, setGenStates] = useState({});
  const [genImages, setGenImages] = useState({});
  const [genErrors, setGenErrors] = useState({});

  useEffect(() => { loadScenes(); }, [projectId]);

  async function loadScenes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/scenes?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) setScenes(json.data || []);
    } catch (err) { setMessage("加载失败: " + err.message); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true); setMessage("");
    try {
      const res = await fetch("/api/generate-scenes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadScenes();
    } catch (err) { setMessage("错误: " + err.message); }
    finally { setGenerating(false); }
  }

  async function handleSave(data) {
    if (editItem) {
      await fetch(`/api/scenes/${editItem.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/scenes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, project_id: projectId }),
      });
    }
    await loadScenes();
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个场景吗？")) return;
    try { await fetch(`/api/scenes/${id}`, { method: "DELETE" }); await loadScenes(); }
    catch (err) { setMessage("删除失败: " + err.message); }
  }

  async function handleGenerateSceneImage(s) {
    const prompt = s.prompt_front || s.prompt;
    if (!prompt?.trim()) { setMessage("请先填写场景提示词"); return; }
    setGenStates((prev) => ({ ...prev, [s.id]: "generating" }));
    setGenErrors((prev) => ({ ...prev, [s.id]: "" }));
    try {
      const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.trim(), size: "1024*1024" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      if (data.results?.[0]?.url) {
        setGenImages((prev) => ({ ...prev, [s.id]: data.results[0].url }));
        setGenStates((prev) => ({ ...prev, [s.id]: "done" }));
      } else if (data.task_id) {
        const taskId = data.task_id;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const poll = await fetch(`/api/media-task?task_id=${taskId}`);
          const pollData = await poll.json();
          if (pollData.status === "SUCCEEDED" && pollData.results?.[0]?.url) {
            setGenImages((prev) => ({ ...prev, [s.id]: pollData.results[0].url }));
            setGenStates((prev) => ({ ...prev, [s.id]: "done" }));
            return;
          }
          if (pollData.status === "FAILED") throw new Error(pollData.error || "生成失败");
        }
        throw new Error("生成超时");
      }
    } catch (err) {
      setGenErrors((prev) => ({ ...prev, [s.id]: err.message }));
      setGenStates((prev) => ({ ...prev, [s.id]: "error" }));
    }
  }

  async function copyScenePrompt(s) {
    const text = [
      `【场景：${s.name}】`,
      `地点：${s.location || "—"}  |  时代：${s.time_period || "—"}`,
      `空间：${s.description || "—"}`,
      `光线：${s.lighting || "—"}  |  风格：${s.style || "—"}`,
      ``,
      `🎬 场景提示词：${s.prompt || "—"}`,
      `🚫 禁止元素：${s.prohibited_elements || "—"}`,
      s.prompt_front ? `📷 主视图：${s.prompt_front}` : "",
      s.prompt_back ? `📷 反打视图：${s.prompt_back}` : "",
      s.prompt_overhead ? `📷 俯视图：${s.prompt_overhead}` : "",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">加载中...</div>;

  return (
    <div className="space-y-4">
      {message && <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

      <div className="flex gap-3">
        <button onClick={() => { setEditItem(null); setShowAdd(true); }}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          手动添加场景
        </button>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
          {generating ? "AI生成中..." : "从剧本生成场景"}
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-sm text-gray-400 py-12 text-center">暂无场景数据</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scenes.map((s) => (
            <div key={s.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                    🏛
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500">{s.location}{s.time_period && ` · ${s.time_period}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditItem(s); setShowAdd(true); }}
                    className="text-blue-600 text-xs hover:underline">编辑</button>
                  <button onClick={() => handleDelete(s.id)}
                    className="text-red-600 text-xs hover:underline">删除</button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-3">
                {s.description && <Row label="空间" value={s.description} />}
                {s.lighting && <Row label="光线" value={s.lighting} />}
                {s.style && <Row label="风格" value={s.style} />}
              </div>

              {s.prompt && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-green-700 mb-1">场景提示词</p>
                  <p className="text-xs text-green-800 leading-relaxed font-mono">{s.prompt}</p>
                </div>
              )}

              {s.prohibited_elements && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">禁止元素</p>
                  <p className="text-xs text-red-800 leading-relaxed">{s.prohibited_elements}</p>
                </div>
              )}

              {/* Multi-angle prompts */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {s.prompt_front && (
                  <div className="bg-gray-50 border rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">主视图</p>
                    <p className="text-xs text-gray-600 font-mono line-clamp-2" title={s.prompt_front}>{s.prompt_front}</p>
                  </div>
                )}
                {s.prompt_back && (
                  <div className="bg-gray-50 border rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">反打视图</p>
                    <p className="text-xs text-gray-600 font-mono line-clamp-2" title={s.prompt_back}>{s.prompt_back}</p>
                  </div>
                )}
                {s.prompt_overhead && (
                  <div className="bg-gray-50 border rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400 mb-0.5">俯视图</p>
                    <p className="text-xs text-gray-600 font-mono line-clamp-2" title={s.prompt_overhead}>{s.prompt_overhead}</p>
                  </div>
                )}
              </div>

              {/* Scene image */}
              {genImages[s.id] ? (
                <div className="rounded-lg overflow-hidden bg-gray-100 relative mb-3 h-40">
                  <img src={genImages[s.id]} alt={s.name} className="w-full h-full object-cover" />
                  <button onClick={() => { setGenImages((prev) => ({ ...prev, [s.id]: "" })); setGenStates((prev) => ({ ...prev, [s.id]: "idle" })); }}
                    className="absolute top-1.5 right-1.5 bg-white/80 text-gray-600 px-2 py-0.5 rounded text-[10px] hover:bg-white">重生成</button>
                </div>
              ) : genStates[s.id] === "generating" ? (
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50/50 mb-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  <p className="text-xs text-blue-600">AI 生成中...</p>
                </div>
              ) : genStates[s.id] === "error" ? (
                <div className="border-2 border-dashed border-red-200 rounded-lg p-3 text-center bg-red-50 mb-3">
                  <p className="text-xs text-red-500">{genErrors[s.id] || "生成失败"}</p>
                  <button onClick={() => handleGenerateSceneImage(s)} className="mt-1 text-xs text-blue-600 hover:underline">重试</button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center mb-3">
                  <div className="text-gray-300 text-xl mb-0.5">🖼</div>
                  <p className="text-xs text-gray-400">场景参考图占位</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => copyScenePrompt(s)}
                  className="flex-1 border border-green-200 text-green-600 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors">
                  {copiedId === s.id ? "已复制" : "复制提示词"}
                </button>
                <button onClick={() => handleGenerateSceneImage(s)} disabled={genStates[s.id] === "generating"}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-all">
                  {genStates[s.id] === "generating" ? "生成中..." : "生成场景图"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <EditModal title={editItem ? "编辑场景" : "添加场景"} fields={FIELDS}
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
