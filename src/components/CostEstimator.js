"use client";

/**
 * CostEstimator — 成本估算组件
 * 静态规则估算生成任务消耗的 credits
 */

const RATES = {
  text_to_image: { per_unit: 1, label: "文生图" },
  image_to_video: { per_unit: 10, label: "图生视频 720p 5s" },
  image_to_video_1080p: { per_unit: 20, label: "图生视频 1080p 5s" },
  text_to_video: { per_unit: 10, label: "文生视频" },
  audio_video: { per_unit: 50, label: "音画视频 5s" },
  lip_sync: { per_unit: 10, label: "口型同步 5s" },
  prompt_polish: { per_unit: 0.1, label: "AI 润色" },
};

export default function CostEstimator({ taskType, count = 1, resolution = "720p", duration = 5, shotsTotal = 0 }) {
  function estimate() {
    let key = taskType;
    if (taskType === "image_to_video" && resolution === "1080p") key = "image_to_video_1080p";
    const rate = RATES[key] || RATES.text_to_image;
    const perTask = rate.per_unit * count * (duration / 5);
    const projectTotal = shotsTotal > 0 ? perTask * shotsTotal : null;
    return { perTask: Math.round(perTask * 10) / 10, rate, projectTotal };
  }

  const { perTask, rate, projectTotal } = estimate();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-amber-700">成本预估</span>
        <span className="text-[10px] text-amber-500">(仅供参考)</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-amber-600">类型：</span>
          <span className="text-amber-800">{rate.label}</span>
        </div>
        <div>
          <span className="text-amber-600">数量：</span>
          <span className="text-amber-800">{count} 个</span>
        </div>
        <div className="col-span-2">
          <span className="text-amber-600">本次预计：</span>
          <span className="text-amber-800 font-bold text-lg">{perTask} credits</span>
        </div>
        {projectTotal != null && (
          <div className="col-span-2 border-t border-amber-200 pt-1.5 mt-0.5">
            <span className="text-amber-600">本项目预计：</span>
            <span className="text-amber-800 font-bold">{Math.round(projectTotal)} credits</span>
            <span className="text-amber-500 text-[10px] ml-1">({shotsTotal} 镜 × {perTask} credits/镜)</span>
          </div>
        )}
      </div>
    </div>
  );
}
