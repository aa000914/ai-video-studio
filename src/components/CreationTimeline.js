"use client";

export default function CreationTimeline({ stages = [], progress = 0 }) {
  const defaultStages = [
    { key: "story", label: "扩展创意为剧本故事", status: "completed" },
    { key: "style", label: "确定视觉基调", status: "completed" },
    { key: "characters", label: "提取核心角色", status: "completed" },
    { key: "char_images", label: "生成角色参考图", status: "completed" },
    { key: "scenes", label: "提取关键场景", status: "completed" },
    { key: "scene_images", label: "生成场景参考图", status: "completed" },
    { key: "shots", label: "生成分镜脚本", status: "completed" },
    { key: "editor", label: "进入分镜编辑器", status: "current" },
  ];

  const items = stages.length > 0 ? stages : defaultStages;

  const statusIcon = (s) => {
    if (s === "completed") return <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>;
    if (s === "running") return <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />;
    if (s === "current") return <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">●</span>;
    return <span className="w-5 h-5 rounded-full bg-gray-600" />;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/5">
        <h2 className="text-white font-semibold text-sm">AI 执行流程</h2>
        <p className="text-gray-500 text-xs mt-1">正在为你构建项目...</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/10" />

          <div className="space-y-6">
            {items.map((item, idx) => (
              <div key={item.key} className="flex gap-3">
                <div className="relative z-10 mt-0.5">{statusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === "completed" ? "text-green-400" : item.status === "running" ? "text-indigo-300" : item.status === "current" ? "text-white font-medium" : "text-gray-500"}`}>
                    {item.label}
                  </p>
                  {item.subtasks && item.status === "running" && (
                    <div className="mt-2 space-y-1.5 pl-1">
                      {item.subtasks.map((sub) => (
                        <div key={sub.key} className="flex items-center gap-2 text-xs">
                          {sub.status === "completed" ? <span className="text-green-400">✓</span> : sub.status === "running" ? <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" /> : <span className="text-gray-600">○</span>}
                          <span className={sub.status === "completed" ? "text-green-400/70" : sub.status === "running" ? "text-indigo-300/80" : "text-gray-600"}>{sub.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom input */}
      <div className="px-4 py-4 border-t border-white/5">
        <textarea placeholder="输入修改意见，继续调整策划案..." rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
        <button className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
          发送修改意见
        </button>
      </div>
    </div>
  );
}
