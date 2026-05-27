"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [debug, setDebug] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    setDebug("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      setDebug("正在请求 /api/projects ...");
      const res = await fetch("/api/projects", {
        signal: controller.signal,
      });
      clearTimeout(timer);

      setDebug(`收到响应: HTTP ${res.status}`);

      const json = await res.json();

      if (res.ok) {
        setProjects(json.data || []);
        setDebug(`成功: 加载了 ${json.data?.length || 0} 个项目`);
      } else {
        const msg = json.error || "未知错误";
        setError(`服务器返回错误: ${msg}`);
        setDebug(`请求失败: ${msg}`);
      }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        setError("请求超时（超过15秒），请检查网络连接或刷新重试");
        setDebug("请求超时");
      } else if (err.message?.includes("NetworkError") || err.message?.includes("fetch")) {
        setError("网络连接失败，请确认浏览器能访问该网址");
        setDebug(`网络错误: ${err.message}`);
      } else {
        setError(`加载失败: ${err.message}`);
        setDebug(`错误详情: ${err.message}\n${err.stack || ""}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

      {/* 错误区域 */}
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

      {/* 调试区域 */}
      {debug && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-gray-500 font-medium mb-1">调试信息</p>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap">{debug}</pre>
        </div>
      )}

      {/* 主内容区 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-400">加载中...</p>
          <p className="text-xs text-gray-400 mt-2">
            如果长时间无响应，请刷新页面
          </p>
        </div>
      ) : error ? null : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg mb-4">暂无项目，请新建第一个项目</div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            新建项目
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
