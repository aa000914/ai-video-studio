"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PlanPanel from "@/components/PlanPanel";
import CharacterPanel from "@/components/CharacterPanel";
import ScenePanel from "@/components/ScenePanel";
import ShotBoardPanel from "@/components/ShotBoardPanel";
import ShotDetailDrawer from "@/components/ShotDetailDrawer";
import GenerationQueuePanel from "@/components/GenerationQueuePanel";
import AssetsPanel from "@/components/AssetsPanel";
import ExportPanel from "@/components/ExportPanel";

const TABS = [
  { key: "overview", label: "概览", icon: "📊" },
  { key: "script", label: "剧本/创意", icon: "📝" },
  { key: "subjects", label: "主体库", icon: "🎭" },
  { key: "shots", label: "Shot Board", icon: "🎬" },
  { key: "tasks", label: "任务", icon: "📋" },
  { key: "assets", label: "素材", icon: "📂" },
  { key: "export", label: "导出", icon: "📦" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("shots");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailShot, setDetailShot] = useState(null);
  const [stats, setStats] = useState({ characters: 0, scenes: 0, shots: 0, hasPlan: false, taskTotal: 0, assetTotal: 0 });

  const projectId = params.id;

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "项目不存在");
      setProject(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadStats = useCallback(async () => {
    try {
      const [charRes, sceneRes, shotRes, planRes, tasksRes] = await Promise.all([
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
      ]);
      const [c, s, sh, p, t] = await Promise.all([charRes.json(), sceneRes.json(), shotRes.json(), planRes.json(), tasksRes.json()]);
      const taskList = t.data || [];
      setStats({
        characters: (c.data || []).length,
        scenes: (s.data || []).length,
        shots: (sh.data || []).length,
        hasPlan: !!p.data,
        taskTotal: taskList.length,
        assetTotal: taskList.filter((x) => x.status === "succeeded" && x.result_url).length,
      });
    } catch { /* silently fail */ }
  }, [projectId]);

  useEffect(() => { loadProject(); loadStats(); }, [loadProject, loadStats]);

  function handleOpenDetail(shot) { setDetailShot(shot); }
  function handleCloseDetail() { setDetailShot(null); loadStats(); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">加载项目...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <span className="text-red-500 font-medium">错误：</span>
          <span className="text-red-700 text-sm">{error}</span>
        </div>
        <button onClick={() => router.push("/")} className="text-blue-600 text-sm hover:underline">返回首页</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shrink-0 px-6 py-4">
        <button onClick={() => router.push("/")}
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
          &larr; 返回首页
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project?.title}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {project?.type && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{project.type}</span>}
              {project?.platform && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{project.platform}</span>}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{project?.status}</span>
              {stats.shots > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{stats.shots} 镜</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b shrink-0 px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium border-b-2 transition-all shrink-0 ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              <span className="text-base">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "overview" && (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white border rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{project?.title}</h2>
              {project?.description && <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="剧本/创意" value={stats.hasPlan ? "✓" : "—"} color="blue" />
              <StatCard label="角色" value={stats.characters} color="green" />
              <StatCard label="场景" value={stats.scenes} color="purple" />
              <StatCard label="分镜" value={stats.shots} color="amber" />
              <StatCard label="生成任务" value={stats.taskTotal} color="indigo" />
              <StatCard label="素材" value={stats.assetTotal} color="teal" />
            </div>
          </div>
        )}

        {activeTab === "script" && (
          <PlanPanel projectId={projectId} onStatsChange={loadStats} />
        )}

        {activeTab === "subjects" && (
          <div className="p-6 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">👤</span>
                <h2 className="text-base font-semibold text-gray-900">角色 ({stats.characters})</h2>
              </div>
              <CharacterPanel projectId={projectId} />
            </div>
            <hr />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏛</span>
                <h2 className="text-base font-semibold text-gray-900">场景 ({stats.scenes})</h2>
              </div>
              <ScenePanel projectId={projectId} />
            </div>
          </div>
        )}

        {activeTab === "shots" && (
          <div className="p-6">
            <ShotBoardPanel
              projectId={projectId}
              onOpenDetail={handleOpenDetail}
              onGenerateImage={() => loadStats()}
              onGenerateVideo={() => loadStats()}
            />
          </div>
        )}

        {activeTab === "tasks" && (
          <GenerationQueuePanel projectId={projectId} />
        )}

        {activeTab === "assets" && (
          <AssetsPanel projectId={projectId} />
        )}

        {activeTab === "export" && (
          <div className="p-6">
            <ExportPanel project={project} projectId={projectId} />
          </div>
        )}
      </div>

      {/* Shot Detail Drawer */}
      {detailShot && (
        <ShotDetailDrawer
          shot={detailShot}
          projectId={projectId}
          onClose={handleCloseDetail}
          onUpdated={loadStats}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600", teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className={`${colors[color] || colors.blue} rounded-xl p-5 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}
