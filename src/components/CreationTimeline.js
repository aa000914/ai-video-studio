"use client";

const DEFAULT_STAGES = [
  { key: "expand_story", label: "扩展创意为剧本故事", subDone: "已扩展剧本", subPending: "" },
  { key: "visual_style", label: "确定视觉基调", subDone: "已确定视觉基调", subPending: "" },
  { key: "extract_characters", label: "提取核心人物", subDone: "已提取主要人物", subPending: "等待提取人物" },
  { key: "char_images", label: "生成人物参考图", subDone: "已生成人物图", subPending: "等待生成人物图" },
  { key: "extract_scenes", label: "提取关键场景", subDone: "已提取关键场景", subPending: "等待提取场景" },
  { key: "scene_images", label: "生成场景参考图", subDone: "已生成场景图", subPending: "等待生成场景图" },
  { key: "generate_shots", label: "生成分镜脚本", subDone: "已生成分镜脚本", subPending: "等待生成分镜" },
  { key: "enter_editor", label: "进入分镜编辑器", subDone: "项目已准备就绪", subPending: "项目已准备就绪" },
];

const HEADER_SUBTITLES = {
  ready: "项目已准备就绪",
  building: "正在为你构建项目...",
};

export default function CreationTimeline({ projectState = {} }) {
  const { hasPlan, hasChars, hasCharImages, hasScenes, hasSceneImages, hasShots } = projectState;

  /**
   * Status rules:
   * Step 0,1: always completed (project page exists → story & style are done)
   * Step 2 (extract_characters): completed if hasChars, else active
   * Step 3 (char_images): completed if hasCharImages, else pending (or active if hasChars)
   * Step 4 (extract_scenes): completed if hasScenes, else pending
   * Step 5 (scene_images): completed if hasSceneImages, else pending (or active if hasScenes)
   * Step 6 (generate_shots): completed if hasShots, else pending
   * Step 7 (enter_editor): completed if hasShots, else pending
   */
  function getStatus(idx) {
    // Steps 0 and 1: always completed
    if (idx === 0) return "completed";
    if (idx === 1) return "completed";
    // Step 2: characters extracted?
    if (idx === 2) return hasChars ? "completed" : "active";
    // Step 3: character images?
    if (idx === 3) {
      if (hasCharImages) return "completed";
      if (hasChars) return "active"; // chars exist but no images yet
      return "pending";
    }
    // Step 4: scenes extracted?
    if (idx === 4) return hasScenes ? "completed" : "pending";
    // Step 5: scene images?
    if (idx === 5) {
      if (hasSceneImages) return "completed";
      if (hasScenes) return "active";
      return "pending";
    }
    // Step 6: shots generated?
    if (idx === 6) return hasShots ? "completed" : "pending";
    // Step 7: enter editor
    if (idx === 7) return hasShots ? "completed" : "pending";
    return "pending";
  }

  function getSubtitle(stage, status) {
    if (status === "completed") return stage.subDone;
    if (status === "active") return stage.subPending || stage.subDone;
    return stage.subPending || "";
  }

  const allDone = hasShots;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/5">
        <h2 className="text-white font-semibold text-sm">AI 执行流程</h2>
        <p className="text-gray-500 text-xs mt-1">
          {allDone ? HEADER_SUBTITLES.ready : HEADER_SUBTITLES.building}
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="relative">
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/10" />
          <div className="space-y-6">
            {DEFAULT_STAGES.map((item, idx) => {
              const status = getStatus(idx);
              const sub = getSubtitle(item, status);

              return (
                <div key={item.key} className="flex gap-3">
                  {/* Status icon */}
                  <div className="relative z-10 mt-0.5">
                    {status === "completed" ? (
                      <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shadow-green-500/30">✓</span>
                    ) : status === "active" ? (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-sm shadow-indigo-500/40" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/10" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      status === "completed" ? "text-green-400" :
                      status === "active" ? "text-white" :
                      "text-gray-500"
                    }`}>
                      {item.label}
                    </p>
                    {sub && (
                      <p className={`text-xs mt-0.5 ${
                        status === "completed" ? "text-green-400/70" :
                        status === "active" ? "text-indigo-400/70" :
                        "text-gray-600"
                      }`}>
                        {status === "active" && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 align-middle animate-pulse" />
                        )}
                        {sub}
                      </p>
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
