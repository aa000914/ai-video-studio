"use client";

export default function TimelineBar({ shots = [], activeShotId, onSelectShot }) {
  const totalDuration = shots.reduce((sum, s) => {
    const d = parseInt(String(s.duration || "5").replace("s", ""));
    return sum + (isNaN(d) ? 5 : d);
  }, 0);

  return (
    <div className="bg-white border-t px-4 py-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {shots.map((s, i) => (
          <button key={s.id}
            onClick={() => onSelectShot?.(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              s.id === activeShotId
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            镜 {s.shot_number}
          </button>
        ))}
        {shots.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 shrink-0 whitespace-nowrap">
            总计 {totalDuration}s
          </span>
        )}
      </div>
    </div>
  );
}
