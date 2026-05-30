"use client";

import { useState, useEffect } from "react";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "selected", label: "已选中" },
  { key: "final", label: "Final" },
];

export default function AssetsPanel({ projectId }) {
  const [assets, setAssets] = useState([]);
  const [shots, setShots] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [assetsRes, shotsRes, tasksRes] = await Promise.all([
        fetch(`/api/generated-assets?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
      ]);
      const a = await assetsRes.json();
      const s = await shotsRes.json();
      const t = await tasksRes.json();

      setAssets(a.data || []);
      if (s.ok) { const map = {}; (s.data || []).forEach((sh) => { map[sh.id] = sh; }); setShots(map); }
      setTasks(t.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  // Auto-refresh when tasks are running
  useEffect(() => {
    const running = tasks.filter((t) => t.status === "running" || t.status === "pending");
    if (running.length === 0) return;
    const interval = setInterval(() => loadAll(), 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const filteredAssets = assets.filter((a) => {
    if (filter === "all") return true;
    if (filter === "selected") return a.is_selected;
    if (filter === "final") return a.is_final;
    return a.type === filter;
  });

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">加载素材...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b shrink-0 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label}
              <span className="ml-1 opacity-70">
                ({f.key === "all" ? assets.length : f.key === "selected" ? assets.filter((a) => a.is_selected).length : f.key === "final" ? assets.filter((a) => a.is_final).length : assets.filter((a) => a.type === f.key).length})
              </span>
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">{assets.length} 个资产</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无素材</h3>
            <p className="text-sm text-gray-500">在 Shot Board 中生成图片或视频</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAssets.map((a) => {
              const shot = shots[a.shot_id];
              const isImage = (a.type || "").includes("image");
              return (
                <div key={a.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                  a.is_selected ? "ring-2 ring-blue-500" : a.is_final ? "ring-2 ring-purple-500" : ""
                }`}>
                  <div className="h-44 bg-gray-100 relative">
                    {isImage ? (
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={a.url} controls className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{isImage ? "🖼" : "🎬"}</div>
                    {a.is_selected && <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">已选中</div>}
                    {a.is_final && <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">Final</div>}
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {shot && <span>镜头 #{shot.shot_number}</span>}
                      {a.provider && <span className="text-gray-300">|</span>}
                      {a.provider && <span className="text-gray-400">{a.provider}</span>}
                      {a.model && <span className="text-gray-300">|</span>}
                      {a.model && <span className="text-gray-400 truncate text-[10px]">{a.model}</span>}
                    </div>
                    <p className="text-xs text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : "—"}</p>
                    <div className="flex gap-2 pt-1">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">打开</a>
                      <button onClick={() => { try { navigator.clipboard.writeText(a.url); } catch {} }} className="text-gray-400 hover:underline text-xs">复制</button>
                      {a.prompt && (
                        <button onClick={() => { try { navigator.clipboard.writeText(a.prompt); } catch {} }}
                          className="text-gray-400 hover:underline text-xs" title={a.prompt}>Pr</button>
                      )}
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
