"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateProjectModal from "@/components/CreateProjectModal";

const STATUS_COLORS = {
  "策划中": "bg-gray-100 text-gray-600",
  "进行中": "bg-blue-100 text-blue-700",
  "已完成": "bg-green-100 text-green-700",
  "已暂停": "bg-yellow-100 text-yellow-700",
};

export default function HomePageClient({ initialProjects, initialError }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProjects() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (res.ok) {
        setProjects(json.data || []);
      } else {
        setError(json.error || "加载失败");
      }
    } catch (err) {
      setError("网络连接失败: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate(project) {
    setShowCreate(false);
    router.push(`/projects/${project.id}`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setDeleteTarget(null);
        await loadProjects();
      } else {
        setError(json.error || "删除失败");
        setDeleteTarget(null);
      }
    } catch (err) {
      setError("网络连接失败: " + err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    setError("");
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        router.push(`/projects/${json.data.id}`);
      } else {
        setError(json.error || "创建演示项目失败");
      }
    } catch (err) {
      setError("网络连接失败: " + err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">项目列表</h2>
          <p className="text-sm text-gray-500 mt-1">从剧本到分镜提示词，一站式管理 AI 视频生产流程。</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadProjects}
            disabled={loading}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {demoLoading ? "创建中..." : "创建演示项目"}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            新建项目
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-medium shrink-0">错误</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
          <button
            onClick={loadProjects}
            className="mt-3 text-sm text-red-600 hover:underline"
          >
            点击重试
          </button>
        </div>
      )}

      {/* 使用场景 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          适合 AI 视频团队的使用场景
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white border rounded-lg px-4 py-3.5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              1
            </span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">资产统一管理</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                剧本、角色、场景、分镜、提示词集中管理。
              </p>
            </div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3.5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold shrink-0">
              2
            </span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">协作信息对齐</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                统一生产文档，减少多人协作信息丢失。
              </p>
            </div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3.5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
              3
            </span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">新人快速上手</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                标准化流程，让新人按步骤完成 AI 视频制作。
              </p>
            </div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3.5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold shrink-0">
              4
            </span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">资产库沉淀</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                角色和场景模板可跨项目复用。
              </p>
            </div>
          </div>
          <div className="bg-white border rounded-lg px-4 py-3.5 flex items-start gap-3 md:col-span-2 lg:col-span-1">
            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold shrink-0">
              5
            </span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">交付效率提升</h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                从剧本到制作包，减少重复劳动。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      {loading && projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg mb-2">暂无项目</div>
          <p className="text-sm text-gray-400 mb-6">
            请创建演示项目或新建项目
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDemo}
              disabled={demoLoading}
              className="bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {demoLoading ? "创建中..." : "创建演示项目"}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              新建项目
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="bg-white border rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow group relative"
            >
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(p);
                }}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                title="删除项目"
              >
                &times;
              </button>

              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate flex-1 mr-6">
                  {p.title}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded shrink-0 ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {p.status}
                </span>
              </div>

              <div className="flex gap-2 mb-2">
                {p.type && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {p.type}
                  </span>
                )}
                {p.platform && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {p.platform}
                  </span>
                )}
              </div>

              {p.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                  {p.description}
                </p>
              )}

              <p className="text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">删除项目</h3>
            <p className="text-sm text-gray-600 mb-1">
              确定要删除项目「{deleteTarget.title}」吗？
            </p>
            <p className="text-xs text-red-500 mb-6">
              此操作将同时删除该项目下的所有角色、场景和分镜数据，不可恢复。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
