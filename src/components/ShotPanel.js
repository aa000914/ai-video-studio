"use client";

import { useState, useEffect } from "react";
import EditModal from "./EditModal";

const FIELDS = [
  { key: "shot_number", label: "镜头编号" },
  { key: "duration", label: "时长" },
  { key: "scene_name", label: "场景名" },
  { key: "characters", label: "出场角色" },
  { key: "visual", label: "画面描述", type: "textarea" },
  { key: "camera", label: "镜头运动" },
  { key: "dialogue", label: "对白", type: "textarea" },
  { key: "sound", label: "音效" },
  { key: "image_prompt", label: "图片提示词", type: "textarea" },
  { key: "video_prompt", label: "视频提示词", type: "textarea" },
  { key: "status", label: "状态" },
];

const STATUS_STYLES = {
  "已通过": "bg-green-100 text-green-700",
  "已生成视频": "bg-purple-100 text-purple-700",
  "已生成图": "bg-blue-100 text-blue-700",
  "需重做": "bg-red-100 text-red-700",
};

export default function ShotPanel({ projectId }) {
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadShots();
  }, [projectId]);

  async function loadShots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shots?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) setShots(json.data || []);
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
      const res = await fetch("/api/generate-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadShots();
    } catch (err) {
      setMessage("错误: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(data) {
    if (editItem) {
      const res = await fetch(`/api/shots/${editItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
    } else {
      const res = await fetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, project_id: projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
    }
    await loadShots();
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个分镜吗？")) return;
    try {
      await fetch(`/api/shots/${id}`, { method: "DELETE" });
      await loadShots();
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
          手动添加分镜
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
        >
          {generating ? "AI生成中..." : "AI生成分镜表"}
        </button>
      </div>

      {shots.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          暂无分镜数据，请手动添加或使用AI生成
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border text-xs w-10">#</th>
                <th className="p-2 border text-xs w-12">时长</th>
                <th className="p-2 border text-xs">场景</th>
                <th className="p-2 border text-xs">人物</th>
                <th className="p-2 border text-xs">画面</th>
                <th className="p-2 border text-xs">运镜</th>
                <th className="p-2 border text-xs">台词</th>
                <th className="p-2 border text-xs w-16">状态</th>
                <th className="p-2 border text-xs w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {shots.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-gray-500 text-center">{s.shot_number}</td>
                  <td className="p-2 border text-xs text-center">{s.duration}</td>
                  <td className="p-2 border text-xs">{s.scene_name}</td>
                  <td className="p-2 border text-xs">{s.characters}</td>
                  <td className="p-2 border text-xs max-w-[200px] truncate" title={s.visual}>
                    {s.visual}
                  </td>
                  <td className="p-2 border text-xs">{s.camera}</td>
                  <td className="p-2 border text-xs max-w-[150px] truncate" title={s.dialogue}>
                    {s.dialogue || "—"}
                  </td>
                  <td className="p-2 border">
                    <span
                      className={"text-xs px-2 py-0.5 rounded font-medium " +
                        (STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600")}
                    >
                      {s.status || "待生成"}
                    </span>
                  </td>
                  <td className="p-2 border">
                    <button
                      onClick={() => {
                        setEditItem(s);
                        setShowAdd(true);
                      }}
                      className="text-blue-600 text-xs hover:underline mr-2"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <EditModal
          title={editItem ? "编辑分镜" : "添加分镜"}
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
