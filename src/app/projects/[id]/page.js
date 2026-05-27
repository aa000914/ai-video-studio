"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ScriptPanel from "@/components/ScriptPanel";
import CharacterPanel from "@/components/CharacterPanel";
import ScenePanel from "@/components/ScenePanel";
import ShotPanel from "@/components/ShotPanel";
import ExportPanel from "@/components/ExportPanel";

const TABS = [
  { key: "script", label: "剧本拆解" },
  { key: "characters", label: "角色资产" },
  { key: "scenes", label: "场景资产" },
  { key: "shots", label: "分镜表" },
  { key: "export", label: "导出" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("script");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProject();
  }, [params.id]);

  async function loadProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "项目不存在");
      setProject(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-gray-400 text-center">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 text-sm hover:underline"
        >
          返回项目列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-block"
        >
          &larr; 返回项目列表
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project.title}
            </h1>
            <div className="flex gap-2 mt-2">
              {project.type && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {project.type}
                </span>
              )}
              {project.platform && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  {project.platform}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-gray-600 mt-3">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "script" && <ScriptPanel projectId={params.id} />}
        {activeTab === "characters" && <CharacterPanel projectId={params.id} />}
        {activeTab === "scenes" && <ScenePanel projectId={params.id} />}
        {activeTab === "shots" && <ShotPanel projectId={params.id} />}
        {activeTab === "export" && (
          <ExportPanel project={project} projectId={params.id} />
        )}
      </div>
    </div>
  );
}
