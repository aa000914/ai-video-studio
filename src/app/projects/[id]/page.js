"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PlanPanel from "@/components/PlanPanel";
import CharacterPanel from "@/components/CharacterPanel";
import ScenePanel from "@/components/ScenePanel";
import ShotPanel from "@/components/ShotPanel";
import ShotEditorPanel from "@/components/ShotEditorPanel";
import ExportPanel from "@/components/ExportPanel";

const STEPS = [
  { key: "plan", label: "策划案", icon: "📋" },
  { key: "subjects", label: "主体库", icon: "🎭" },
  { key: "storyboard", label: "分镜剧本", icon: "📜" },
  { key: "editor", label: "分镜编辑 · 生图 · 生视频", icon: "✂️" },
  { key: "export", label: "导出制作包", icon: "📦" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    characters: 0, scenes: 0, shots: 0, hasPlan: false,
    pendingShots: 0, imageDoneShots: 0, videoDoneShots: 0, redoShots: 0, approvedShots: 0,
  });

  const projectId = params.id;

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "项目不存在");
      setProject(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadStats = useCallback(async () => {
    try {
      const [charRes, sceneRes, shotRes, planRes] = await Promise.all([
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/plans?project_id=${projectId}`),
      ]);
      const [c, s, sh, p] = await Promise.all([
        charRes.json(), sceneRes.json(), shotRes.json(), planRes.json(),
      ]);
      const shots = sh.data || [];
      setStats({
        characters: (c.data || []).length,
        scenes: (s.data || []).length,
        shots: shots.length,
        hasPlan: !!p.data,
        pendingShots: shots.filter((s) => !s.status || s.status === "待生成").length,
        imageDoneShots: shots.filter((s) => s.status === "已生成图").length,
        videoDoneShots: shots.filter((s) => s.status === "已生成视频").length,
        redoShots: shots.filter((s) => s.status === "需重做").length,
        approvedShots: shots.filter((s) => s.status === "已通过").length,
      });
    } catch { /* silently fail */ }
  }, [projectId]);

  useEffect(() => { loadProject(); loadStats(); }, [loadProject, loadStats]);

  const completionPct = stats.shots > 0 ? Math.round((stats.approvedShots / stats.shots) * 100) : 0;

  function stepStatus(key) {
    if (key === "plan") return stats.hasPlan ? "done" : activeTab === key ? "active" : "pending";
    if (key === "subjects") return stats.characters > 0 || stats.scenes > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "storyboard" || key === "editor" || key === "generate")
      return stats.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "export") return stats.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
    return "pending";
  }

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
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-medium shrink-0">错误</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
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
              {project?.type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{project.type}</span>}
              {project?.platform && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{project.platform}</span>}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{project?.status}</span>
            </div>
          </div>
          {stats.shots > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-gray-400">完成度</div>
                <div className="text-2xl font-bold text-blue-600">{completionPct}%</div>
              </div>
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${Math.min(completionPct * 0.97, 97)} 100`} strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Stats dashboard */}
        {stats.shots > 0 && (
          <div className="mt-4 grid grid-cols-4 md:grid-cols-8 gap-2">
            <MiniStat label="角色" value={stats.characters} />
            <MiniStat label="场景" value={stats.scenes} />
            <MiniStat label="分镜" value={stats.shots} />
            <MiniStat label="待生成" value={stats.pendingShots} color="text-gray-500" />
            <MiniStat label="已生图" value={stats.imageDoneShots} color="text-blue-600" />
            <MiniStat label="已生视频" value={stats.videoDoneShots} color="text-purple-600" />
            <MiniStat label="需重做" value={stats.redoShots} color="text-red-600" />
            <MiniStat label="已通过" value={stats.approvedShots} color="text-green-600" />
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b shrink-0 px-6">
        <div className="flex gap-0 overflow-x-auto">
          {STEPS.map((step, i) => {
            const status = stepStatus(step.key);
            return (
              <button key={step.key} onClick={() => setActiveTab(step.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all shrink-0 ${
                  activeTab === step.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  status === "done" ? "bg-green-500 text-white"
                    : activeTab === step.key ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}>
                  {status === "done" ? "✓" : i + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "plan" && <PlanPanel projectId={projectId} onStatsChange={loadStats} />}
        {activeTab === "subjects" && (
          <div className="p-6 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">👤</span>
                <h2 className="text-base font-semibold text-gray-900">角色主体</h2>
                <span className="text-xs text-gray-400">({stats.characters})</span>
              </div>
              <CharacterPanel projectId={projectId} />
            </div>
            <hr className="border-gray-200" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🏛</span>
                <h2 className="text-base font-semibold text-gray-900">场景主体</h2>
                <span className="text-xs text-gray-400">({stats.scenes})</span>
              </div>
              <ScenePanel projectId={projectId} />
            </div>
          </div>
        )}
        {activeTab === "storyboard" && <ShotPanel projectId={projectId} />}
        {activeTab === "editor" && <ShotEditorPanel projectId={projectId} />}
        {activeTab === "export" && <ExportPanel project={project} projectId={projectId} />}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center px-2 py-1.5 bg-white border rounded-lg">
      <div className={`text-sm font-bold ${color || "text-gray-900"}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}
