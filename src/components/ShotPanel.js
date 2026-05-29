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

  useEffect(() => { loadShots(); }, [projectId]);

  async function loadShots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shots?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) setShots(json.data || []);
    } catch (err) { setMessage("加载失败: " + err.message); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true); setMessage("");
    try {
      const res = await fetch("/api/generate-shots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadShots();
    } catch (err) { setMessage("错误: " + err.message); }
    finally { setGenerating(false); }
  }

  async function handleSave(data) {
    if (editItem) {
      await fetch(`/api/shots/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    } else {
      await fetch("/api/shots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, project_id: projectId }) });
    }
    await loadShots();
  }

  async function handleDelete(id) {
    if (!confirm("确定要删除这个分镜吗？")) return;
    try { await fetch(`/api/shots/${id}`, { method: "DELETE" }); await loadShots(); }
    catch (err) { setMessage("删除失败: " + err.message); }
  }

  const imageCount = shots.filter(s => s.image_url).length;
  const videoCount = shots.filter(s => s.video_url).length;

  if (loading) return <div className="text-sm text-gray-500 py-12 text-center">加载中...</div>;

  return (
    <div className="space-y-4 max-w-full">
      {message && <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm">{message}</div>}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button onClick={() => { setEditItem(null); setShowAdd(true); }}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            + 手动添加分镜
          </button>
          <button onClick={handleGenerate} disabled={generating}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
            {generating ? "AI 生成中..." : "AI 生成分镜表"}
          </button>
        </div>
        {shots.length > 0 && (
          <span className="text-xs text-gray-400">
            共 {shots.length} 镜 · 🖼 {imageCount} · 🎬 {videoCount}
          </span>
        )}
      </div>

      {shots.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-xl">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-sm text-gray-500">暂无分镜数据</p>
          <p className="text-xs text-gray-400 mt-1">点击"AI 生成分镜表"或手动添加</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-b">
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-12 text-center">#</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">场景</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">角色</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">时长</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">画面描述</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">运镜</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500">台词</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-20">状态</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-500 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {shots.map((s, idx) => {
                const rowBg = idx % 2 === 0 ? "" : "bg-gray-50/50";
                const leftBorder = s.status === "已通过" ? "border-l-2 border-l-green-400" :
                  s.status === "需重做" ? "border-l-2 border-l-red-400" : "";
                return (
                <tr key={s.id} className={`${rowBg} ${leftBorder} hover:bg-blue-50/50 transition-colors`}>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold text-gray-500">#{s.shot_number}</span>
                    {(s.image_url || s.video_url) && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {s.image_url && <span className="text-[10px]" title="有图">🖼</span>}
                        {s.video_url && <span className="text-[10px]" title="有视频">🎬</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[120px] truncate" title={s.scene_name}>{s.scene_name || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[100px] truncate" title={s.characters}>{s.characters || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{s.duration || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px] truncate" title={s.visual}>{s.visual || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{s.camera || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[140px] truncate" title={s.dialogue}>{s.dialogue || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600"}`}>
                      {s.status || "待生成"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5">
                      <button onClick={() => { setEditItem(s); setShowAdd(true); }}
                        className="text-blue-600 text-xs hover:bg-blue-50 px-2 py-1 rounded transition-colors">编辑</button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-red-500 text-xs hover:bg-red-50 px-2 py-1 rounded transition-colors">删</button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <EditModal title={editItem ? "编辑分镜" : "添加分镜"} fields={FIELDS}
          initialData={editItem} onClose={() => { setShowAdd(false); setEditItem(null); }} onSave={handleSave} />
      )}
    </div>
  );
}
