"use client";

import { useState, useEffect } from "react";

export default function PlanPanel({ projectId, onStatsChange }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Dialog edit
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editRequest, setEditRequest] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState(null);
  const [editError, setEditError] = useState("");

  // Regenerate
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { loadPlan(); }, [projectId]);

  async function loadPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok && json.data) setPlan(json.data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  async function handleCopy() {
    if (!plan) return;
    const text = [
      `【策划案】`,
      `策划摘要：${plan.summary || "—"}`,
      `美术风格：${plan.art_style || "—"}`,
      `内容类型：${plan.content_type || "—"}`,
      `画面比例：${plan.aspect_ratio || "—"}`,
      `创作模式：${plan.mode || "—"}`,
      `音乐风格：${plan.music_style || "—"}`,
      `旁白风格：${plan.narration_style || "—"}`,
      `分镜数量：${plan.storyboard_count || "—"}`,
      `剧集数：${plan.episode_count || "1"}`,
      ``, `【剧本】`, plan.script_text || "—",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError("复制失败"); }
  }

  async function handleRegenerate() {
    if (!plan) return;
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          project_id: projectId,
          request: `请根据以下剧本摘要重新生成完整策划案，保持内容类型和风格，但重新细化所有细节：\n\n${plan.script_text || plan.summary || ""}`,
          current_plan: plan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "重新生成失败");
      if (json.data?.plan) {
        setEditedPlan(json.data.plan);
      }
    } catch (err) { setError("重新生成失败: " + err.message); }
    finally { setRegenerating(false); }
  }

  async function handleEditPlan() {
    if (!editRequest.trim()) return;
    setEditingPlan(true);
    setEditError("");
    setEditedPlan(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          action: "edit",
          request: editRequest.trim(),
          current_plan: plan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "修改失败");

      if (json.data?.plan) {
        setEditedPlan(json.data.plan);
      } else {
        // API returned plan data directly
        setEditedPlan(json.data);
      }
    } catch (err) { setEditError(err.message); }
    finally { setEditingPlan(false); }
  }

  async function handleApplyEdit() {
    if (!editedPlan) return;
    try {
      // Update plan via PUT
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          ...editedPlan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存失败");
      setPlan(editedPlan);
      setShowEditDialog(false);
      setEditedPlan(null);
      setEditRequest("");
      if (onStatsChange) onStatsChange();
    } catch (err) { setError("应用修改失败: " + err.message); }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">加载策划案...</div>;
  }

  if (!plan) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="font-semibold text-gray-900 mb-2">暂无策划案</h3>
        <p className="text-sm text-gray-500 mb-6">请返回首页，通过灵感输入创建策划案</p>
        <a href="/" className="text-blue-600 text-sm hover:underline">返回首页</a>
      </div>
    );
  }

  const displayPlan = editedPlan || plan;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

      {/* Header actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleCopy}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          {copied ? "已复制" : "复制策划案"}
        </button>
        <button onClick={handleRegenerate} disabled={regenerating}
          className="border border-blue-300 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50">
          {regenerating ? "重新生成中..." : "重新生成策划案"}
        </button>
        <button onClick={() => setShowEditDialog(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-indigo-400 hover:to-purple-500 shadow-sm">
          💬 对话修改策划案
        </button>
      </div>

      {editedPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-amber-700">📝 修改后版本（预览）</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditedPlan(null); setEditRequest(""); }}
                className="border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleApplyEdit}
                className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-amber-700">
                确认应用
              </button>
            </div>
          </div>
          <p className="text-xs text-amber-600">当前为预览版本，确认后将覆盖原策划案。</p>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && !editedPlan && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">💬 对话修改策划案</h3>
          <p className="text-xs text-gray-500">输入修改要求，例如「增加一个反派角色」「修改画风为赛博朋克」「将分镜改为 10 个」。</p>
          <textarea value={editRequest} onChange={(e) => setEditRequest(e.target.value)}
            rows={3} placeholder="请输入修改要求..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
          />
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowEditDialog(false); setEditRequest(""); }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              取消
            </button>
            <button onClick={handleEditPlan} disabled={editingPlan || !editRequest.trim()}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {editingPlan ? "AI 处理中..." : "提交修改"}
            </button>
          </div>
        </div>
      )}

      {/* Plan details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="美术风格" value={displayPlan.art_style} icon="🎨" />
        <InfoCard label="内容类型" value={displayPlan.content_type} icon="📺" />
        <InfoCard label="创作模式" value={displayPlan.mode} icon="✍️" />
        <InfoCard label="画面比例" value={displayPlan.aspect_ratio} icon="📐" />
        <InfoCard label="分镜数量" value={`${displayPlan.storyboard_count || "—"} 个`} icon="🎬" />
        <InfoCard label="剧集数" value={displayPlan.episode_count > 1 ? `${displayPlan.episode_count} 集` : "单集"} icon="📚" />
        <InfoCard label="音乐风格" value={displayPlan.music_style} icon="🎵" />
        <InfoCard label="旁白风格" value={displayPlan.narration_style} icon="🎙️" />
      </div>

      <Section title="策划摘要">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayPlan.summary || "—"}</p>
      </Section>

      <Section title="剧本内容">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayPlan.script_text || "—"}</p>
      </Section>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}
