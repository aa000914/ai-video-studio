"use client";

export default function ImagePreviewModal({ url, name, prompt, model, time, typeLabel, onClose, onRegenerate }) {
  if (!url) return null;

  const isPerson = typeLabel === "人物";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}>
      <div className="max-w-5xl max-h-[95vh] mx-4 w-full" onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className={`rounded-xl overflow-hidden shadow-2xl ${isPerson ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" : "bg-black/40"}`}>
          <img
            src={url}
            alt={name || ""}
            className={`w-full ${isPerson ? "object-contain max-h-[70vh] min-h-[50vh]" : "object-contain max-h-[75vh]"} mx-auto`}
          />
        </div>

        {/* Info bar */}
        <div className="mt-4 bg-gray-900/90 backdrop-blur rounded-xl border border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                {typeLabel && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isPerson ? "bg-indigo-500/20 text-indigo-300" : "bg-teal-500/20 text-teal-300"
                  }`}>
                    {typeLabel}
                  </span>
                )}
                {name && <p className="text-white font-semibold text-sm">{name}</p>}
              </div>
              {prompt && (
                <div className="mt-2">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">中文提示词</p>
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">{prompt}</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-600">
                {model && <span>模型：{model}</span>}
                {time && <span>生成时间：{time}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {onRegenerate && (
                <button type="button" onClick={onRegenerate}
                  className="text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-600/50 rounded-lg px-3 py-1.5">
                  重新生成
                </button>
              )}
              <button type="button" onClick={onClose}
                className="text-gray-400 hover:text-white text-xs border border-gray-600/50 rounded-lg px-3 py-1.5">
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
