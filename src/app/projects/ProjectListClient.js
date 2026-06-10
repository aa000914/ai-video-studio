"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Trash2, Film } from "lucide-react";

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #312e81, #6366f1)",
  "linear-gradient(135deg, #1e3a8a, #06b6d4)",
  "linear-gradient(135deg, #7c2d12, #f97316)",
  "linear-gradient(135deg, #064e3b, #14b8a6)",
  "linear-gradient(135deg, #831843, #a855f7)",
  "linear-gradient(135deg, #0f172a, #3b82f6)",
];

function getCoverGradient(title) {
  const sum = [...(title || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

export default function ProjectListClient({ initialProjects, initialError }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState(initialError);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(id) {
    if (deletingId !== id) { setDeletingId(id); return; }
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
    } catch (err) {
      setError(err.message);
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FC" }}>
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight">项目</h1>
            <p className="text-sm text-[#64748b] mt-1">共 {projects.length} 个项目</p>
          </div>
          <button onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
            style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)", color: "white" }}>
            <Plus size={16} /> 新建项目
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Project Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(15,23,42,0.04)" }}>
              <Film size={24} color="#94a3b8" />
            </div>
            <p className="text-sm text-[#64748b] mb-1">暂无项目</p>
            <p className="text-xs text-[#94a3b8] mb-6">先生成一个策划案</p>
            <button onClick={() => router.push("/")}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)", color: "white" }}>
              去创建项目
            </button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-white overflow-hidden transition-all hover:-translate-y-1 group"
                style={{ borderRadius: "22px", boxShadow: "0 12px 32px rgba(15,23,42,0.10)", border: "1px solid rgba(15,23,42,0.06)" }}>
                {/* Cover */}
                <div className="h-[190px] relative overflow-hidden" style={{ background: getCoverGradient(p.title) }}>
                  <div className="absolute rounded-full opacity-30" style={{ width: "100px", height: "100px", top: "20%", right: "20%", background: "rgba(255,255,255,0.12)", filter: "blur(20px)" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute top-3.5 right-4">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                      {p.status || "策划中"}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-5">
                  <h3 className="font-semibold text-[#0f172a] text-[15px] mb-2 truncate">{p.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#64748b] mb-3">
                    {p.type && <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>{p.type}</span>}
                    <span>{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <button onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)", color: "white" }}>
                      打开项目 <ExternalLink size={12} />
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className={`py-2.5 px-3 text-xs font-medium rounded-xl transition-all ${deletingId === p.id ? "bg-red-500 text-white" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}>
                      {deletingId === p.id ? "确认删除？" : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
