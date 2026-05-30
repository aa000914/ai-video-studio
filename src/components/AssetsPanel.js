"use client";

import { useState, useEffect } from "react";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "selected", label: "已选中" },
];

export default function AssetsPanel({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [shots, setShots] = useState({});

  useEffect(() => { loadData(); }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [tasksRes, shotsRes] = await Promise.all([
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
        fetch(`/api/shots?project_id=${projectId}`),
      ]);
      const t = await tasksRes.json();
      const s = await shotsRes.json();
      if (t.ok) setTasks(t.data || []);
      if (s.ok) {
        const map = {};
        (s.data || []).forEach((sh) => { map[sh.id] = sh; });
        setShots(map);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  // 运行中的任务自动刷新
  useEffect(() => {
    const running = tasks.filter((t) => t.status === "running" || t.status === "pending");
    if (running.length === 0) return;
    const interval = setInterval(() => loadData(), 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const succeededAssets = tasks.filter((t) => t.status === "succeeded" && t.result_url);

  const filteredAssets = succeededAssets.filter((t) => {
    if (filter === "all") return true;
    if (filter === "selected") return t.result_url && (shots[t.shot_id]?.selected_image_url === t.result_url || shots[t.shot_id]?.selected_video_url === t.result_url);
    return t.type === filter || t.type === `text_to_${filter}`;
  });

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">加载素材...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b shrink-0 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label} ({f.key === "all" ? succeededAssets.length : f.key === "selected" ? filteredAssets.length : succeededAssets.filter((t) => t.type === f.key).length})
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{succeededAssets.length} 个素材</span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无素材</h3>
            <p className="text-sm text-gray-500">在分镜中生成图片或视频后，结果将显示在这里</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAssets.map((t) => {
              const shot = shots[t.shot_id];
              const isSelected = shot?.selected_image_url === t.result_url || shot?.selected_video_url === t.result_url;
              const isImage = t.type === "image";
              return (
                <div key={t.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                  isSelected ? "ring-2 ring-indigo-500" : ""
                }`}>
                  {/* Preview */}
                  <div className="h-44 bg-gray-100 relative">
                    {isImage ? (
                      <img src={t.result_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={t.result_url} controls className="w-full h-full object-cover" />
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        已选中
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {isImage ? "🖼" : "🎬"}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {shot && <span>镜头 #{shot.shot_number}</span>}
                      {t.model && <span className="text-gray-300">|</span>}
                      {t.model && <span className="text-gray-400 truncate">{t.model}</span>}
                    </div>
                    <p className="text-xs text-gray-400">
                      {t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : "—"}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <a href={t.result_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs">打开</a>
                      <button onClick={() => { try { navigator.clipboard.writeText(t.result_url); } catch {} }}
                        className="text-gray-400 hover:underline text-xs">复制链接</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
