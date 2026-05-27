"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ScriptPanel from "@/components/ScriptPanel";
import CharacterPanel from "@/components/CharacterPanel";
import ScenePanel from "@/components/ScenePanel";
import ShotPanel from "@/components/ShotPanel";
import ExportPanel from "@/components/ExportPanel";

const STEPS = [
  {
    key: "script",
    label: "剧本拆解",
    icon: "📖",
    description:
      "把小说、剧本或大纲粘贴进来，AI 自动提取角色清单、场景清单、剧情摘要和分镜建议。将非结构化的文字内容转化为可制作的资产结构。",
  },
  {
    key: "characters",
    label: "角色资产",
    icon: "👤",
    description:
      "统一管理每个角色的形象描述、服装设定和 AI 生图提示词。沉淀角色资产库，确保同一角色在不同镜头中形象一致，避免出现'换脸'问题。",
  },
  {
    key: "scenes",
    label: "场景资产",
    icon: "🏛",
    description:
      "沉淀场景描述、灯光方案和氛围提示词，形成可复用的场景资产库。后续项目可直接调用已有场景，减少重复设计工作。",
  },
  {
    key: "shots",
    label: "分镜表",
    icon: "🎬",
    description:
      "将每个镜头变成可执行的任务卡片：画面描述、镜头运动、对白、音效、图片/视频提示词。每个镜头可追踪生成状态，方便分配给视频生成师执行。",
  },
  {
    key: "export",
    label: "导出制作包",
    icon: "📦",
    description:
      "一键导出完整的制作包：包含分镜表、提示词汇总，支持 Markdown 和 CSV 格式。可直接交给视频生成师和剪辑师使用，无需二次整理。",
  },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("script");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ characters: 0, scenes: 0, shots: 0 });

  const loadProject = useCallback(async () => {
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
  }, [params.id]);

  const loadStats = useCallback(async () => {
    try {
      const [charRes, sceneRes, shotRes] = await Promise.all([
        fetch(`/api/characters?project_id=${params.id}`),
        fetch(`/api/scenes?project_id=${params.id}`),
        fetch(`/api/shots?project_id=${params.id}`),
      ]);
      const [c, s, sh] = await Promise.all([
        charRes.json(),
        sceneRes.json(),
        shotRes.json(),
      ]);
      setStats({
        characters: (c.data || []).length,
        scenes: (s.data || []).length,
        shots: (sh.data || []).length,
      });
    } catch {
      // silently fail — stats are cosmetic
    }
  }, [params.id]);

  useEffect(() => {
    loadProject();
    loadStats();
  }, [loadProject, loadStats]);

  const activeStep = STEPS.find((s) => s.key === activeTab);
  const activeIndex = STEPS.findIndex((s) => s.key === activeTab);

  function stepStatus(key) {
    const counts = { characters: stats.characters, scenes: stats.scenes, shots: stats.shots };
    if (key === "script") return counts.characters > 0 || counts.scenes > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "characters") return counts.characters > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "scenes") return counts.scenes > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "shots") return counts.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
    if (key === "export") return counts.shots > 0 ? "done" : activeTab === key ? "active" : "pending";
    return "pending";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
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
      {/* ========== Header ========== */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-gray-400 hover:text-gray-600 mb-3 inline-block transition-colors"
        >
          &larr; 返回项目列表
        </button>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              {project.type && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                  {project.type}
                </span>
              )}
              {project.platform && (
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                  {project.platform}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                {project.status}
              </span>
            </div>
          </div>
          {/* Mini stats */}
          <div className="hidden sm:flex gap-4 text-center shrink-0">
            <div className="px-3 py-2 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.characters}</div>
              <div className="text-xs text-blue-500">角色</div>
            </div>
            <div className="px-3 py-2 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.scenes}</div>
              <div className="text-xs text-green-500">场景</div>
            </div>
            <div className="px-3 py-2 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{stats.shots}</div>
              <div className="text-xs text-purple-500">分镜</div>
            </div>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-3xl">
            {project.description}
          </p>
        )}
      </div>

      {/* ========== Production Flow Stepper ========== */}
      <div className="bg-white border rounded-xl p-5 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          生产流程
        </h3>
        <div className="flex items-center">
          {STEPS.map((step, i) => {
            const status = stepStatus(step.key);
            const isLast = i === STEPS.length - 1;

            return (
              <div key={step.key} className="flex-1 flex items-center">
                {/* Step button */}
                <button
                  onClick={() => setActiveTab(step.key)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0"
                >
                  {/* Circle badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                      status === "done"
                        ? "bg-green-500 text-white shadow-sm"
                        : status === "active"
                          ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {status === "done" ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      status === "active"
                        ? "text-blue-600"
                        : status === "done"
                          ? "text-green-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-2 mt-[-1.25rem]">
                    <div
                      className={`h-full rounded-full transition-colors ${
                        i < activeIndex || status === "done" ? "bg-green-400" : "bg-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== Module Description ========== */}
      {activeStep && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{activeStep.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm mb-1">
                {activeStep.label}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {activeStep.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========== Tab Content ========== */}
      <div className="bg-white border rounded-xl p-5 min-h-[400px]">
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
