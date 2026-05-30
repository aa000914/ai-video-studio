"use client";

import { useState, useEffect } from "react";

const TYPE_LABELS = { image: "🖼 生图", t2v: "🎬 文生视频", i2v: "🎬 图生视频", video_edit: "✂️ 编辑" };
const STATUS_CONFIG = {
  queued: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  pending: { label: "排队中", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  running: { label: "生成中", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  succeeded: { label: "成功", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  failed: { label: "失败", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  cancelled: { label: "已取消", bg: "bg-gray-200", text: "text-gray-500", dot: "bg-gray-400" },
};

export default function GenerationQueuePanel({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadTasks(); }, [projectId]);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}&limit=500`);
      const json = await res.json();
      if (res.ok) setTasks(json.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const running = tasks.filter((t) => t.status === "running" || t.status === "pending");
    if (running.length === 0) return;
    const interval = setInterval(async () => {
      for (const t of running) {
        try {
          const res = await fetch(`/api/generation/status?id=${t.id}`);
          const json = await res.json();
          if (json.status === "succeeded" || json.status === "failed") { loadTasks(); break; }
        } catch { /* continue */ }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tasks]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.type === filter);
  const runningCount = tasks.filter((t) => t.status === "running" || t.status === "pending").length;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b shrink-0 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <FilterChip label="全部" value="all" current={filter} onClick={setFilter} count={tasks.length} />
          <FilterChip label="生图" value="image" current={filter} onClick={setFilter} count={tasks.filter((t) => t.type === "image").length} />
          <FilterChip label="视频" value="i2v" current={filter} onClick={setFilter} count={tasks.filter((t) => t.type === "i2v" || t.type === "t2v").length} />
        </div>
        {runningCount > 0 && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{runningCount} 进行中</span>}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-sm text-gray-400 py-12 text-center">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无任务</h3>
            <p className="text-sm text-gray-500">在 Shot Board 中生成图片或视频</p>
          </div>
        ) : (
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">
                <Th>类型</Th><Th>模型</Th><Th>状态</Th><Th>提示词</Th><Th>时间</Th><Th>结果</Th><Th>错误</Th>
              </tr></thead>
              <tbody>
                {filtered.map((t) => {
                  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{TYPE_LABELS[t.type] || t.type}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.model || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]"><p className="truncate text-xs text-gray-600" title={t.prompt || ""}>{t.prompt || "—"}</p></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{t.result_url ? <a href={t.result_url} target="_blank" className="text-blue-500 hover:underline text-xs">查看</a> : <span className="text-gray-400 text-xs">—</span>}</td>
                      <td className="px-4 py-3 max-w-[200px]">{t.error_message ? <p className="text-red-500 text-xs truncate" title={t.error_message}>{t.error_message}</p> : <span className="text-gray-400 text-xs">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }) { return <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{children}</th>; }
function FilterChip({ label, value, current, onClick, count }) {
  return (
    <button onClick={() => onClick(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        current === value ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}>{label} ({count})</button>
  );
}
