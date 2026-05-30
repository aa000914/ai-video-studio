"use client";

import { useState } from "react";

const DEFAULT_STAGES = [
  { key: "expand_story", label: "扩展创意为剧本故事", sub: "已生成故事梗概" },
  { key: "visual_style", label: "确定视觉基调", sub: "已确定画面风格" },
  { key: "extract_characters", label: "提取核心人物", sub: "已提取主要人物" },
  { key: "char_images", label: "生成人物参考图", sub: "已生成人物参考图" },
  { key: "extract_scenes", label: "提取关键场景", sub: "已提取关键场景" },
  { key: "scene_images", label: "生成场景参考图", sub: "已生成场景参考图" },
  { key: "generate_shots", label: "生成分镜脚本", sub: "已生成分镜脚本" },
  { key: "enter_editor", label: "进入分镜编辑器", sub: "可开始编辑分镜" },
];

export default function CreationTimeline({ projectState = {} }) {
  const [feedback, setFeedback] = useState("");

  // Compute stage status based on project data
  const { hasPlan, hasChars, hasCharImages, hasScenes, hasSceneImages, hasShots } = projectState;

  function getStatus(idx) {
    const checks = [hasPlan, hasPlan, hasChars, hasCharImages, hasScenes, hasSceneImages, hasShots, false];
    if (idx === 0) return hasPlan ? "completed" : "pending";
    if (checks[idx]) return "completed";
    // If previous step is done and this one isn't, it's pending/running
    if (idx > 0 && checks[idx - 1]) return "pending";
    return "pending";
  }

  const statusIcon = (s) => {
    if (s === "completed") return <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>;
    if (s === "running") return <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />;
    return <span className="w-5 h-5 rounded-full bg-white/10" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/5">
        <h2 className="text-white font-semibold text-sm">AI 执行流程</h2>
        <p className="text-gray-500 text-xs mt-1">
          {hasShots ? "项目已准备就绪" : "正在为你构建项目..."}
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="relative">
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/10" />
          <div className="space-y-6">
            {DEFAULT_STAGES.map((item, idx) => {
              const status = getStatus(idx);
              return (
                <div key={item.key} className="flex gap-3">
                  <div className="relative z-10 mt-0.5">{statusIcon(status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${status === "completed" ? "text-green-400" : status === "running" ? "text-indigo-300" : "text-gray-500"}`}>
                      {item.label}
                    </p>
                    {status === "completed" && item.sub && (
                      <p className="text-xs text-green-400/60 mt-0.5">{item.sub}</p>
                    )}
                    {status === "running" && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-indigo-300/70">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        执行中...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const v = e.target.feedback?.value?.trim(); if (!v) { alert("请输入修改意见"); return; } alert("已收到修改意见，后续将用于重新生成策划案。"); e.target.feedback.value = ""; }}
        className="px-4 py-4 border-t border-white/5">
        <textarea name="feedback" placeholder="输入修改意见，继续调整策划案..." rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
        <button type="submit" className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          发送修改意见
        </button>
      </form>
    </div>
  );
}
