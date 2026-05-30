"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CreationTimeline from "@/components/CreationTimeline";
import CreationDocument from "@/components/CreationDocument";
import ShotBoardPanel from "@/components/ShotBoardPanel";
import SimpleShotEditModal from "@/components/SimpleShotEditModal";
import TimelineBar from "@/components/TimelineBar";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [mode, setMode] = useState("doc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingShot, setEditingShot] = useState(null);
  const [shotsList, setShotsList] = useState([]);
  const [message, setMessage] = useState("");
  const [generatingId, setGeneratingId] = useState(null);

  const projectId = params.id;

  function showMsg(text) { setMessage(text); setTimeout(() => setMessage(""), 3000); }

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "项目不存在");
      setProject(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadShots = useCallback(async () => {
    try {
      const res = await fetch(`/api/shots?project_id=${projectId}`);
      const json = await res.json();
      setShotsList((json.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0)));
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { loadProject(); loadShots(); }, [loadProject, loadShots]);

  // ---- 保存分镜 handler ----
  function handleSaveShot(updatedShot) {
    setShotsList((prev) => prev.map((s) => (s.id === updatedShot.id ? { ...s, ...updatedShot } : s)));
  }

  // ---- 生视频 handler ----
  async function handleGenerateVideo(shot) {
    if (!shot?.id) { showMsg("分镜数据异常"); return; }
    const imageUrl = shot.selected_image_url || shot.image_url;
    if (!imageUrl) { showMsg("请先生成或选择首帧图，再生成视频。"); return; }
    const prompt = shot.refined_video_prompt || shot.video_prompt || "Generate video from this image";
    setGeneratingId(shot.id);
    try {
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, shotId: shot.id, type: "i2v", prompt: prompt.trim().slice(0, 600), imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      showMsg("视频生成任务已提交，请到任务页查看进度。");
      loadShots();
    } catch (err) { showMsg("生视频失败: " + err.message); }
    finally { setGeneratingId(null); }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-[#0a0f1e] text-gray-400 text-sm">加载中...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f1e]">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button type="button" onClick={() => { setError(""); loadProject(); }} className="text-indigo-400 text-sm hover:underline mr-3">重试</button>
          <button type="button" onClick={() => router.push("/")} className="text-indigo-400 text-sm hover:underline">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: mode === "doc" ? "#0a0f1e" : "#f6f7fb" }}>
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{ background: mode === "doc" ? "rgba(255,255,255,0.03)" : "white", borderBottom: mode === "doc" ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.push("/")}
            className="text-xs text-gray-500 hover:text-gray-300">
            &larr; 首页
          </button>
          <h1 className={`text-sm font-semibold ${mode === "doc" ? "text-white" : "text-gray-900"}`}>
            {project?.title}
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => setMode("doc")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "doc" ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            📄 策划文档
          </button>
          <button type="button" onClick={() => setMode("editor")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "editor" ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            🎬 分镜编辑器
          </button>
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm max-w-sm animate-pulse">
          {message}
        </div>
      )}

      {/* Mode: 策划文档 */}
      {mode === "doc" && (
        <div className="flex-1 flex min-h-0">
          <div className="w-[34%] border-r border-white/5">
            <CreationTimeline />
          </div>
          <div className="w-[66%]">
            <CreationDocument projectId={projectId} onEnterEditor={() => setMode("editor")} />
          </div>
        </div>
      )}

      {/* Mode: 分镜编辑器 */}
      {mode === "editor" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto p-6">
            <ShotBoardPanel
              projectId={projectId}
              onEdit={setEditingShot}
              onGenerateVideo={handleGenerateVideo}
              generatingId={generatingId}
            />
          </div>
          {shotsList.length > 0 && (
            <TimelineBar shots={shotsList} onSelectShot={setEditingShot} />
          )}
        </div>
      )}

      {/* Simple Edit Modal */}
      {editingShot && (
        <SimpleShotEditModal
          shot={editingShot}
          onClose={() => setEditingShot(null)}
          onSave={handleSaveShot}
        />
      )}
    </div>
  );
}
