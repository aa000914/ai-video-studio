"use client";

import { useState, useEffect } from "react";

export default function OverviewPanel({ projectId, onJumpToShots }) {
  const [project, setProject] = useState(null);
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState({
    characters: 0, scenes: 0, shots: 0, hasPlan: false,
    imageCount: 0, videoCount: 0, finalCount: 0,
    taskTotal: 0, taskSucceeded: 0, taskFailed: 0, taskRunning: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [projRes, planRes, charRes, sceneRes, shotRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
      ]);
      const [proj, pl, chars, scs, shots, tasks] = await Promise.all([
        projRes.json(), planRes.json(), charRes.json(), sceneRes.json(), shotRes.json(), tasksRes.json(),
      ]);

      setProject(proj.data || null);
      setPlan(pl.data || null);
      const shotList = shots.data || [];
      const taskList = tasks.data || [];

      setStats({
        characters: (chars.data || []).length,
        scenes: (scs.data || []).length,
        shots: shotList.length,
        hasPlan: !!pl.data,
        imageCount: shotList.filter((s) => s.image_url || s.selected_image_url).length,
        videoCount: shotList.filter((s) => s.video_url || s.selected_video_url).length,
        finalCount: shotList.filter((s) => s.status === "已通过" || s.final_asset_id).length,
        taskTotal: taskList.length,
        taskSucceeded: taskList.filter((t) => t.status === "succeeded").length,
        taskFailed: taskList.filter((t) => t.status === "failed").length,
        taskRunning: taskList.filter((t) => t.status === "running" || t.status === "pending").length,
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function calcProgress() {
    let pct = 0;
    if (stats.hasPlan) pct = 10;
    if (stats.characters > 0 || stats.scenes > 0) pct = 20;
    if (stats.shots > 0) pct = 30;
    const shotsWithPrompt = stats.shots > 0; // shots exist = prompts exist
    if (shotsWithPrompt) pct = 40;
    if (stats.imageCount > 0) pct = 60;
    if (stats.videoCount > 0) pct = 80;
    if (stats.finalCount > 0) pct = 100;
    if (stats.taskRunning > 0 && pct < 60) pct = Math.max(pct, 45);
    return pct;
  }

  const progress = calcProgress();
  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">加载中...</div>;
  if (!project) return <div className="text-center py-16 text-gray-500">项目不存在</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{project.title}</h2>
          {progress < 100 && (
            <button onClick={onJumpToShots}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all">
              继续制作 &rarr;
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700">生产进度</span>
            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span className={stats.hasPlan ? "text-green-600 font-medium" : ""}>策划案 10%</span>
            <span className={stats.characters > 0 || stats.scenes > 0 ? "text-green-600 font-medium" : ""}>主体库 20%</span>
            <span className={stats.shots > 0 ? "text-green-600 font-medium" : ""}>分镜 30%</span>
            <span className={stats.imageCount > 0 ? "text-green-600 font-medium" : ""}>首帧图 60%</span>
            <span className={stats.videoCount > 0 ? "text-green-600 font-medium" : ""}>视频 80%</span>
            <span className={stats.finalCount > 0 ? "text-green-600 font-medium" : ""}>Final 100%</span>
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          {project.type && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{project.type}</span>}
          {project.platform && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{project.platform}</span>}
          {plan?.aspect_ratio && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{plan.aspect_ratio}</span>}
          {plan?.art_style && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{plan.art_style}</span>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="分镜" value={stats.shots} color="amber" />
        <StatCard label="主体" value={stats.characters + stats.scenes} color="blue" />
        <StatCard label="已生图" value={stats.imageCount} color="green" />
        <StatCard label="已生视频" value={stats.videoCount} color="purple" />
        <StatCard label="Final" value={stats.finalCount} color="teal" />
        <StatCard label="任务成功" value={`${stats.taskSucceeded}/${stats.taskTotal}`} color="indigo" />
        <StatCard label="任务失败" value={stats.taskFailed} color="red" />
        <StatCard label="运行中" value={stats.taskRunning} color="blue" />
      </div>

      {/* Workflow checklist */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">工作流步骤</h3>
        <div className="space-y-2">
          <CheckItem done={stats.hasPlan} label="策划案" desc="AI 生成项目策划案" />
          <CheckItem done={stats.characters > 0 || stats.scenes > 0} label="主体库" desc={`${stats.characters} 角色 · ${stats.scenes} 场景`} />
          <CheckItem done={stats.shots > 0} label="分镜" desc={`${stats.shots} 个分镜`} />
          <CheckItem done={stats.imageCount > 0} label="首帧图" desc={`${stats.imageCount} 个镜头已生图`} />
          <CheckItem done={stats.videoCount > 0} label="视频生成" desc={`${stats.videoCount} 个镜头已生视频`} />
          <CheckItem done={stats.finalCount > 0} label="Final 输出" desc={`${stats.finalCount} 个已通过`} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600", teal: "bg-teal-50 text-teal-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className={`${colors[color] || colors.blue} rounded-xl p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}

function CheckItem({ done, label, desc }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
      }`}>{done ? "✓" : "○"}</div>
      <div>
        <span className={`text-sm ${done ? "text-gray-900 font-medium" : "text-gray-400"}`}>{label}</span>
        <span className="text-xs text-gray-400 ml-2">{desc}</span>
      </div>
    </div>
  );
}
