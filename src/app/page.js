"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreateProjectModal from "@/components/CreateProjectModal";

const STATUS_COLORS = {
  "策划中": "bg-gray-100 text-gray-600",
  "进行中": "bg-blue-100 text-blue-700",
  "已完成": "bg-green-100 text-green-700",
  "已暂停": "bg-yellow-100 text-yellow-700",
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (res.ok) {
        setProjects(json.data || []);
      } else {
        setError(json.error || "加载失败");
      }
    } catch (err) {
      setError("无法连接服务器，请确认 Supabase 已配置");
    } finally {
      setLoading(false);
    }
  }

  function handleCreate(project) {
    setShowCreate(false);
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">项目列表</h2>
          <p className="text-sm text-gray-500 mt-1">AI视频生产工作台 V1</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          新建项目
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">加载中...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg mb-4">还没有项目</div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-blue-600 text-sm hover:underline"
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="bg-white border rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate flex-1 mr-2">
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

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
