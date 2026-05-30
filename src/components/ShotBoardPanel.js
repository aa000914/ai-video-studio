"use client";

import { useState, useEffect } from "react";

const STATUS_CONFIG = {
  "待生成": "bg-gray-100 text-gray-600",
  "已生成图": "bg-blue-100 text-blue-700",
  "已生成视频": "bg-purple-100 text-purple-700",
  "需重做": "bg-red-100 text-red-700",
  "已通过": "bg-green-100 text-green-700",
};

export default function ShotBoardPanel({ projectId, onOpenDetail, onGenerateImage, onGenerateVideo }) {
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { loadShots(); }, [projectId]);

  async function loadShots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/shots?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok) {
        const data = (json.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
        setShots(data);
      }
    } catch (err) { setMessage("加载失败: " + err.message); }
    finally { setLoading(false); }
  }

  async function handleGenerateShots() {
    setGenerating(true); setMessage("");
    try {
      const res = await fetch("/api/generate-shots", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      setMessage(json.message || "生成成功");
      await loadShots();
    } catch (err) { setMessage(err.message); }
    finally { setGenerating(false); }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text || ""); }
    catch { /* ignore */ }
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">加载分镜...</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 items-center">
          <button onClick={handleGenerateShots} disabled={generating}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            {generating ? "AI 生成中..." : "AI 生成分镜"}
          </button>
          <span className="text-xs text-gray-400">{shots.length} 个镜头</span>
        </div>
        {message && <span className="text-xs text-blue-600">{message}</span>}
      </div>

      {/* Shot cards grid */}
      {shots.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-xl">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-sm text-gray-500">暂无分镜</p>
          <p className="text-xs text-gray-400 mt-1">点击"AI 生成分镜"开始</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shots.map((s) => (
            <ShotCard
              key={s.id}
              shot={s}
              onEdit={() => onOpenDetail?.(s)}
              onGenerateImage={() => onGenerateImage?.(s)}
              onGenerateVideo={() => onGenerateVideo?.(s)}
              onCopy={copyText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShotCard({ shot, onEdit, onGenerateImage, onGenerateVideo, onCopy }) {
  const statusClass = STATUS_CONFIG[shot.status] || "bg-gray-100 text-gray-600";

  return (
    <div className="bg-white border rounded-xl hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            {shot.shot_number}
          </span>
          <span className="text-sm font-semibold text-gray-900">{shot.scene_name || "—"}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
          {shot.status || "待生成"}
        </span>
      </div>

      {/* Thumbnail */}
      <div className="h-36 bg-gray-100 relative overflow-hidden">
        {shot.selected_image_url || shot.image_url ? (
          <img src={shot.selected_image_url || shot.image_url} alt={`Shot ${shot.shot_number}`}
            className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 text-4xl">🎬</div>
        )}
        {(shot.selected_video_url || shot.video_url) && (
          <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
            🎥 有视频
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 text-xs text-gray-500 bg-white/80 rounded px-1.5">
          {shot.duration || "—"}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-2">
        {shot.characters && (
          <p className="text-xs text-gray-600 truncate" title={shot.characters}>
            <span className="text-gray-400">角色：</span>{shot.characters}
          </p>
        )}
        {shot.visual && (
          <p className="text-xs text-gray-600 line-clamp-2" title={shot.visual}>
            <span className="text-gray-400">画面：</span>{shot.visual}
          </p>
        )}
        {shot.camera && <p className="text-xs text-gray-500"><span className="text-gray-400">运镜：</span>{shot.camera}</p>}
      </div>

      {/* Prompts (condensed) */}
      <div className="px-4 pb-1 space-y-1">
        {shot.image_prompt && (
          <div className="bg-blue-50 rounded p-2 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => onCopy(shot.image_prompt)}
            title="点击复制图片提示词">
            <p className="text-[10px] text-blue-600 font-medium mb-0.5">图片 Prompt</p>
            <p className="text-xs text-blue-800 font-mono line-clamp-2">{shot.image_prompt}</p>
          </div>
        )}
        {shot.video_prompt && (
          <div className="bg-purple-50 rounded p-2 cursor-pointer hover:bg-purple-100 transition-colors"
            onClick={() => onCopy(shot.video_prompt)}
            title="点击复制视频提示词">
            <p className="text-[10px] text-purple-600 font-medium mb-0.5">视频 Prompt</p>
            <p className="text-xs text-purple-800 font-mono line-clamp-2">{shot.video_prompt}</p>
          </div>
        )}
        {shot.audio_prompt && (
          <div className="bg-amber-50 rounded p-2 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => onCopy(shot.audio_prompt)}
            title="点击复制音频提示词">
            <p className="text-[10px] text-amber-600 font-medium mb-0.5">音频 Prompt</p>
            <p className="text-xs text-amber-800 font-mono line-clamp-2">{shot.audio_prompt}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t flex gap-2 flex-wrap">
        <button onClick={onEdit}
          className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition-colors">
          编辑
        </button>
        <button onClick={() => onGenerateImage?.(shot)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 transition-colors shadow-sm">
          生图
        </button>
        <button onClick={() => onGenerateVideo?.(shot)}
          className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700 transition-colors shadow-sm">
          生视频
        </button>
        <button onClick={() => onCopy(shot.image_prompt || shot.video_prompt)}
          className="border border-gray-200 text-gray-400 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-50 transition-colors">
          复制
        </button>
      </div>
    </div>
  );
}
