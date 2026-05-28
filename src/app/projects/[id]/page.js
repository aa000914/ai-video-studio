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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ characters: 0, scenes: 0, shots: 0, hasPlan: false });

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
        charRes.json(),
        sceneRes.json(),
        shotRes.json(),
        planRes.json(),
      ]);
      setStats({
        characters: (c.data || []).length,
        scenes: (s.data || []).length,
        shots: (sh.data || []).length,
        hasPlan: !!p.data,
      });
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadStats();
  }, [loadProject, loadStats]);

  function stepStatus(key) {
    if (key === "plan") return stats.hasPlan ? "done" : activeTab === key ? "active" : "pending";
    if (key === "characters") return stats.characters > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "scenes") return stats.scenes > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "storyboard") return stats.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "editor") return stats.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
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
        <button onClick={() => router.push("/")} className="text-blue-600 text-sm hover:underline">
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b shrink-0 px-6 py-4">
        <button
          onClick={() => router.push("/")}
          className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block"
        >
          &larr; 返回首页
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              {project.type && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{project.type}</span>
              )}
              {project.platform && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{project.platform}</span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{project.status}</span>
            </div>
          </div>
          {/* Mini stats */}
          <div className="flex gap-3 text-center shrink-0">
            <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.characters}</div>
              <div className="text-xs text-blue-500">角色</div>
            </div>
            <div className="px-3 py-1.5 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.scenes}</div>
              <div className="text-xs text-green-500">场景</div>
            </div>
            <div className="px-3 py-1.5 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{stats.shots}</div>
              <div className="text-xs text-purple-500">分镜</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step tabs */}
      <div className="bg-white border-b shrink-0 px-6">
        <div className="flex gap-0">
          {STEPS.map((step, i) => {
            const status = stepStatus(step.key);
            return (
              <button
                key={step.key}
                onClick={() => setActiveTab(step.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === step.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  status === "done"
                    ? "bg-green-500 text-white"
                    : activeTab === step.key
                      ? "bg-blue-600 text-white"
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
