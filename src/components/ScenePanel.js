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
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{s.name}</h4>
                  <p className="text-xs text-gray-500">
                    {s.location} {s.time_period && `· ${s.time_period}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditItem(s);
                      setShowAdd(true);
                    }}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-600 text-xs hover:underline ml-2"
                  >
                    删除
                  </button>
                </div>
              </div>
              {s.description && (
                <p className="text-sm text-gray-600 mt-2">{s.description}</p>
              )}
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                {s.style && <span>风格: {s.style}</span>}
                {s.lighting && <span>光线: {s.lighting}</span>}
              </div>
              {s.prompt && (
                <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded">
                  提示词：{s.prompt}
                </p>
              )}
              {s.prohibited_elements && (
                <p className="text-xs text-red-400 mt-1 bg-red-50 p-2 rounded">
                  禁止元素：{s.prohibited_elements}
                </p>
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
