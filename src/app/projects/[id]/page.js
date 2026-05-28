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
  { key: "characters", label: "角色主体", icon: "👤" },
  { key: "scenes", label: "场景主体", icon: "🏛" },
  { key: "storyboard", label: "分镜剧本", icon: "📜" },
  { key: "editor", label: "分镜编辑", icon: "✂️" },
  { key: "export", label: "导出制作包", icon: "📦" },
];

const STATUS_LABELS = {
  total: "总分镜",
  pending: "待生成",
  imageDone: "已生成图",
  videoDone: "已生成视频",
  redo: "需重做",
  approved: "已通过",
};

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
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadStats();
  }, [loadProject, loadStats]);

  const completionPct = stats.shots > 0 ? Math.round((stats.approvedShots / stats.shots) * 100) : 0;

  function stepStatus(key) {
    if (key === "plan") return stats.hasPlan ? "done" : activeTab === key ? "active" : "pending";
    if (key === "characters") return stats.characters > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "scenes") return stats.scenes > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "storyboard" || key === "editor") return stats.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b shrink-0 px-6 py-4">
        <button onClick={() => router.push("/")}
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
          &larr; 返回首页
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {project.type && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{project.type}</span>}
              {project.platform && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{project.platform}</span>}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{project.status}</span>
            </div>
          </div>
          {/* Completion ring */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-400">完成度</div>
              <div className="text-2xl font-bold text-blue-600">{completionPct}%</div>
            </div>
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2563eb" strokeWidth="3"
                strokeDasharray={`${completionPct * 0.97} 100`} strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Production Dashboard */}
        {stats.shots > 0 && (
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-3">
            <DashCard label="角色" value={stats.characters} color="blue" />
            <DashCard label="场景" value={stats.scenes} color="green" />
            <DashCard label="分镜" value={stats.shots} color="purple" />
            <DashCard label="待生成" value={stats.pendingShots} color="gray" />
            <DashCard label="已生成图" value={stats.imageDoneShots} color="blue" />
            <DashCard label="已生成视频" value={stats.videoDoneShots} color="purple" />
            <DashCard label="需重做" value={stats.redoShots} color="red" />
            <DashCard label="已通过" value={stats.approvedShots} color="green" />
          </div>
        )}
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b shrink-0 px-6">
        <div className="flex gap-0">
          {STEPS.map((step, i) => {
            const status = stepStatus(step.key);
            return (
              <button key={step.key} onClick={() => setActiveTab(step.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
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
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "plan" && <PlanPanel projectId={params.id} />}
        {activeTab === "characters" && <CharacterPanel projectId={params.id} />}
        {activeTab === "scenes" && <ScenePanel projectId={params.id} />}
        {activeTab === "storyboard" && <ShotPanel projectId={params.id} />}
        {activeTab === "editor" && <ShotEditorPanel projectId={params.id} />}
        {activeTab === "export" && <ExportPanel project={project} projectId={params.id} />}
      </div>
    </div>
  );
}

function DashCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`border rounded-lg px-3 py-2 text-center ${colors[color] || colors.gray}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}
