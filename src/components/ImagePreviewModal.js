"use client";

export default function ImagePreviewModal({ url, name, prompt, model, onClose, onRegenerate }) {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="max-w-3xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={name || ""} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
        <div className="mt-3 text-center">
          {name && <p className="text-white text-sm font-semibold">{name}</p>}
          {prompt && <p className="text-gray-400 text-xs mt-1 max-w-lg mx-auto line-clamp-2">{prompt}</p>}
          {model && <p className="text-gray-500 text-[10px] mt-0.5">模型：{model}</p>}
          <div className="mt-3 flex gap-2 justify-center">
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-sm border border-gray-600 rounded-lg px-4 py-1.5">关闭</button>
            {onRegenerate && <button type="button" onClick={onRegenerate} className="text-indigo-400 hover:text-indigo-300 text-sm border border-indigo-600 rounded-lg px-4 py-1.5">重新生成</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
