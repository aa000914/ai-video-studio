"use client";

import { useState, useEffect } from "react";
import EditModal from "./EditModal";

const FIELDS = [
  { key: "name", label: "场景名称" },
  { key: "location", label: "地点" },
  { key: "time_period", label: "时间段" },
  { key: "description", label: "场景描述", type: "textarea" },
  { key: "lighting", label: "灯光方案" },
  { key: "style", label: "视觉风格" },
  { key: "prompt", label: "AI生图提示词", type: "textarea" },
  { key: "notes", label: "备注", type: "textarea" },
];

export default function ScenePanel({ projectId }) {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadScenes();
  }, [projectId]);

  async function loadScenes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/scenes?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) setScenes(json.data || []);
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
      const res = await fetch("/api/generate-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadScenes();
    } catch (err) {
      setMessage("错误: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(data) {
    if (editItem) {
      const res = await fetch(`/api/scenes/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
    } else {
      const res = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, project_id: projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
    }
    await loadScenes();
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个场景吗？")) return;
    try {
      await fetch(`/api/scenes/${id}`, { method: "DELETE" });
      await loadScenes();
    } catch (err) {
      setMessage("删除失败: " + err.message);
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setEditItem(null);
            setShowAdd(true);
          }}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          手动添加场景
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {generating ? "AI生成中..." : "从剧本生成场景"}
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          暂无场景数据，请手动添加或使用AI生成
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scenes.map((s) => (
            <div key={s.id} className="bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                    🏛
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-500">
                      {s.location}{s.time_period && ` · ${s.time_period}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditItem(s); setShowAdd(true); }}
                    className="text-blue-600 text-xs hover:underline"
                  >编辑</button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-600 text-xs hover:underline"
                  >删除</button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {s.description && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 w-10 text-xs">描述</span>
                    <span className="text-gray-700">{s.description}</span>
                  </div>
                )}
                {s.lighting && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 w-10 text-xs">光线</span>
                    <span className="text-gray-700">{s.lighting}</span>
                  </div>
                )}
                {s.style && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 w-10 text-xs">风格</span>
                    <span className="text-gray-700">{s.style}</span>
                  </div>
                )}
              </div>

              {s.prompt && (
                <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">🎬 场景提示词</p>
                  <p className="text-xs text-green-800 leading-relaxed">{s.prompt}</p>
                </div>
              )}

              {s.notes && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">🚫 禁止元素 / 备注</p>
                  <p className="text-xs text-red-800 leading-relaxed">{s.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <EditModal
          title={editItem ? "编辑场景" : "添加场景"}
          fields={FIELDS}
          initialData={editItem}
          onClose={() => {
            setShowAdd(false);
            setEditItem(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
