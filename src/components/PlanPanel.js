"use client";

import { useState, useEffect } from "react";

export default function PlanPanel({ projectId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPlan();
  }, [projectId]);

  async function loadPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok && json.data) setPlan(json.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
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
    } catch {
      setError("复制失败");
    }
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

  return (
    <div className="max-w-4xl space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* Header actions */}
      <div className="flex gap-3">
        <a
          href="/"
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          返回首页重新生成
        </a>
        <button
          onClick={handleCopy}
          className="border border-blue-300 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50"
        >
          {copied ? "已复制" : "复制策划案"}
        </button>
      </div>

      {/* Plan details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="美术风格" value={plan.art_style} icon="🎨" />
        <InfoCard label="内容类型" value={plan.content_type} icon="📺" />
        <InfoCard label="创作模式" value={plan.mode} icon="✍️" />
        <InfoCard label="画面比例" value={plan.aspect_ratio} icon="📐" />
        <InfoCard label="分镜数量" value={`${plan.storyboard_count || "—"} 个`} icon="🎬" />
        <InfoCard label="剧集数" value={plan.episode_count > 1 ? `${plan.episode_count} 集` : "单集"} icon="📚" />
        <InfoCard label="音乐风格" value={plan.music_style} icon="🎵" />
        <InfoCard label="旁白风格" value={plan.narration_style} icon="🎙️" />
      </div>

      {/* Summary */}
      <Section title="策划摘要">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{plan.summary || "—"}</p>
      </Section>

      {/* Script text */}
      <Section title="剧本内容">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{plan.script_text || "—"}</p>
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
