"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TYPE_LABELS = {
  image: "🖼 生图",
  t2v: "🎬 文生视频",
  i2v: "🎬 图生视频",
  video_edit: "✂️ 视频编辑",
};

const STATUS_CONFIG = {
  pending: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  running: { label: "生成中", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  succeeded: { label: "成功", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  failed: { label: "失败", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [projects, setProjects] = useState({});

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  async function loadTasks() {
    try {
      // Query all generation_tasks via a custom API or direct
      const res = await fetch("/api/tasks");
      const json = await res.json();
      if (res.ok) {
        setTasks(json.data || []);
      }
    } catch (err) {
      console.error("加载任务失败:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects?limit=100");
      const json = await res.json();
      if (res.ok) {
        const map = {};
        (json.data || []).forEach((p) => { map[p.id] = p.title; });
        setProjects(map);
      }
    } catch { /* ignore */ }
  }

  // Live polling for running tasks
  useEffect(() => {
    const runningTasks = tasks.filter((t) => t.status === "running" || t.status === "pending");
    if (runningTasks.length === 0) return;

    const interval = setInterval(async () => {
      for (const t of runningTasks) {
        try {
          const res = await fetch(`/api/generation/status?id=${t.id}`);
          const json = await res.json();
          if (json.status === "succeeded" || json.status === "failed") {
            // Reload all tasks to get updated state
            loadTasks();
            break;
          }
        } catch { /* continue polling */ }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks]);

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.type === filter);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shrink-0 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">生成任务中心</h1>
        <p className="text-sm text-gray-500 mt-1">追踪所有图片和视频的生成任务状态</p>
      </div>

      {/* Filters */}
      <div className="bg-white border-b shrink-0 px-6 py-3 flex gap-2 overflow-x-auto">
        <FilterChip label="全部" value="all" current={filter} onClick={setFilter} count={tasks.length} />
        <FilterChip label="生图" value="image" current={filter} onClick={setFilter}
          count={tasks.filter((t) => t.type === "image").length} />
        <FilterChip label="图生视频" value="i2v" current={filter} onClick={setFilter}
          count={tasks.filter((t) => t.type === "i2v").length} />
        <FilterChip label="文生视频" value="t2v" current={filter} onClick={setFilter}
          count={tasks.filter((t) => t.type === "t2v").length} />
        <FilterChip label="视频编辑" value="video_edit" current={filter} onClick={setFilter}
          count={tasks.filter((t) => t.type === "video_edit").length} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无生成任务</h3>
            <p className="text-sm text-gray-500">在分镜编辑器中生成图片或视频后，任务将显示在这里</p>
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <Th>类型</Th>
                    <Th>模型</Th>
                    <Th>项目</Th>
                    <Th>分镜</Th>
                    <Th>状态</Th>
                    <Th>提示词</Th>
                    <Th>创建时间</Th>
                    <Th>结果</Th>
                    <Th>错误</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => {
                    const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{TYPE_LABELS[t.type] || t.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.model || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.project_id && projects[t.project_id] ? (
                            <Link href={`/projects/${t.project_id}`} className="text-blue-600 hover:underline">
                              {projects[t.project_id]}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.shot_id ? (
                            <Link href={`/projects/${t.project_id}`} className="text-xs text-blue-500 hover:underline">
                              #{t.shot_id?.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="truncate text-xs text-gray-600" title={t.prompt || ""}>
                            {t.prompt || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {t.result_url ? (
                            <a href={t.result_url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-xs">
                              查看结果
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {t.error_message ? (
                            <p className="text-red-500 text-xs truncate" title={t.error_message}>
                              {t.error_message}
                            </p>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>;
}

function FilterChip({ label, value, current, onClick, count }) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        current === value
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label} {count !== undefined ? `(${count})` : ""}
    </button>
  );
}
