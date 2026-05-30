"use client";

import { useState, useEffect } from "react";

const TYPE_MAP = { image: "图片", video: "视频", audio: "音频", reference_image: "参考图", reference_video: "参考视频" };
const FILTERS = ["全部", "图片", "视频", "已选中", "Final"];

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState({});
  const [shots, setShots] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("全部");
  const [projectFilter, setProjectFilter] = useState("all");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/tasks?limit=500"),
      ]);
      const projJson = await projectsRes.json();
      const tasksJson = await tasksRes.json();

      const projMap = {};
      (projJson.data || []).forEach((p) => { projMap[p.id] = p; });
      setProjects(projMap);

      // Load generated_assets per project
      let allAssets = [];
      const projIds = Object.keys(projMap);
      const assetResults = await Promise.all(projIds.map((pid) => fetch(`/api/generated-assets?project_id=${pid}`)));
      const assetJsons = await Promise.all(assetResults.map((r) => r.json()));
      assetJsons.forEach((j) => { if (j.data) allAssets = allAssets.concat(j.data); });

      // Fallback: if generated_assets empty, map from tasks
      if (allAssets.length === 0) {
        const succeeded = (tasksJson.data || []).filter((t) => t.status === "succeeded" && t.result_url);
        allAssets = succeeded.map((t) => ({
          id: t.id, project_id: t.project_id, shot_id: t.shot_id,
          type: t.type === "image" ? "image" : "video",
          url: t.result_url, provider: t.provider, model: t.model,
          prompt: t.prompt, created_at: t.created_at,
          is_selected: false, is_final: false,
        }));
      }

      setAssets(allAssets);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const filtered = assets.filter((a) => {
    if (projectFilter !== "all" && a.project_id !== projectFilter) return false;
    if (filter === "全部") return true;
    if (filter === "已选中") return a.is_selected;
    if (filter === "Final") return a.is_final;
    return (a.type || "").includes(filter === "图片" ? "image" : filter === "视频" ? "video" : "");
  });

  const imageCount = assets.filter((a) => (a.type || "").includes("image")).length;
  const videoCount = assets.filter((a) => !(a.type || "").includes("image")).length;
  const selectedCount = assets.filter((a) => a.is_selected).length;
  const finalCount = assets.filter((a) => a.is_final).length;

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-gray-400">加载资产库...</div>;

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">资产库</h1>
          <p className="text-sm text-gray-500 mt-1">集中管理所有项目生成的图片、视频和参考素材</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatBox label="全部资产" value={assets.length} />
          <StatBox label="图片" value={imageCount} color="blue" />
          <StatBox label="视频" value={videoCount} color="purple" />
          <StatBox label="已选首帧" value={selectedCount} color="green" />
          <StatBox label="Final" value={finalCount} color="amber" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-indigo-600 text-white shadow-sm" : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}>{f}</button>
          ))}
          <span className="text-gray-300 mx-1">|</span>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-xs bg-white text-gray-600">
            <option value="all">全部项目</option>
            {Object.entries(projects).map(([id, p]) => (
              <option key={id} value={id}>{p.title}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} 个资产</span>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无资产</h3>
            <p className="text-sm text-gray-500">在分镜工作台生成的图片和视频会出现在这里。</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((a) => {
              const proj = projects[a.project_id];
              const isImage = (a.type || "").includes("image");
              return (
                <div key={a.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                  a.is_selected ? "ring-2 ring-blue-500" : a.is_final ? "ring-2 ring-purple-500" : ""
                }`}>
                  <div className="h-40 bg-gray-100 relative">
                    {isImage ? (
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={a.url} controls className="w-full h-full object-cover" />
                    )}
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {TYPE_MAP[a.type] || a.type || "—"}
                    </span>
                    {a.is_selected && <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">首帧</span>}
                    {a.is_final && <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">Final</span>}
                  </div>
                  <div className="p-3 space-y-1.5">
                    {proj && (
                      <a href={`/projects/${a.project_id}`} className="text-sm font-medium text-indigo-600 hover:underline block truncate">
                        {proj.title}
                      </a>
                    )}
                    <p className="text-xs text-gray-400">
                      {a.created_at ? new Date(a.created_at).toLocaleString("zh-CN") : "—"}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">查看</a>
                      <button onClick={() => { try { navigator.clipboard.writeText(a.url); } catch {} }} className="text-gray-400 hover:underline text-xs">复制链接</button>
                      {proj && (
                        <a href={`/projects/${a.project_id}`} className="text-gray-400 hover:underline text-xs">打开项目</a>
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

function StatBox({ label, value, color }) {
  const cs = color === "blue" ? "text-blue-600 bg-blue-50" : color === "purple" ? "text-purple-600 bg-purple-50" : color === "green" ? "text-green-600 bg-green-50" : color === "amber" ? "text-amber-600 bg-amber-50" : "text-gray-600 bg-gray-50";
  return (
    <div className={`${cs} rounded-xl p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}
