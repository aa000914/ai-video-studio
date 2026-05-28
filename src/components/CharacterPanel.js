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
  { key: "notes", label: "备注", type: "textarea" },
];

export default function CharacterPanel({ projectId }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCharacters();
  }, [projectId]);

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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
    } else {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          手动添加角色
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {generating ? "AI生成中..." : "从剧本生成角色"}
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          暂无角色数据，请手动添加或使用AI生成
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {characters.map((c) => (
            <div key={c.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{c.name}</h4>
                  <p className="text-xs text-gray-500">
                    {c.role} {c.age && `· ${c.age}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditItem(c);
                      setShowAdd(true);
                    }}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600 text-xs hover:underline ml-2"
                  >
                    删除
                  </button>
                </div>
              </div>
              {c.personality && (
                <p className="text-sm text-gray-600 mt-2">{c.personality}</p>
              )}
              {c.appearance && (
                <p className="text-sm text-gray-500 mt-1">{c.appearance}</p>
              )}
              {c.costume && (
                <p className="text-sm text-gray-500 mt-1">服装：{c.costume}</p>
              )}
              {c.prompt && (
                <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded">
                  提示词：{c.prompt}
                </p>
              )}
              {c.prohibited_changes && (
                <p className="text-xs text-red-400 mt-1 bg-red-50 p-2 rounded">
                  禁止变化点：{c.prohibited_changes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <EditModal
          title={editItem ? "编辑角色" : "添加角色"}
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
