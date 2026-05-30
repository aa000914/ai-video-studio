"use client";

export default function ProjectError({ error, reset }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">项目页面出错了</h2>
        <p className="text-sm text-gray-500 mb-6">{error?.message || "页面加载异常，请刷新重试。"}</p>
        <button type="button" onClick={() => reset()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 mr-3">
          重试
        </button>
        <a href="/" className="text-indigo-600 text-sm hover:underline">返回首页</a>
      </div>
    </div>
  );
}
