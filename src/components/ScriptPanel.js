"use client";

import { useState } from "react";

export default function ScriptPanel({ projectId }) {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function analyze() {
    if (!script.trim()) {
      setError("请粘贴剧本内容");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "分析失败");
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          剧本内容
        </label>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={12}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="在此粘贴剧本、小说章节或故事大纲..."
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        onClick={analyze}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "AI分析中..." : "AI拆解剧本"}
      </button>

      {result && (
        <div className="bg-white border rounded-lg p-5 space-y-5">
          {result.parseError ? (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">AI原始输出</h3>
              <pre className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap text-gray-700">
                {result.raw}
              </pre>
              <p className="text-amber-600 text-sm mt-2">
                JSON解析失败，请手动查看并处理以上内容
              </p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">剧情摘要</h3>
                <p className="text-sm text-gray-600">{result.summary}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  角色清单 ({result.characters?.length || 0})
                </h3>
                <div className="space-y-2">
                  {result.characters?.map((c, i) => (
                    <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-500 ml-2">({c.role})</span>
                      {c.age && <span className="text-gray-500 ml-2">{c.age}</span>}
                      <p className="text-gray-600 mt-1">{c.personality}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  场景清单 ({result.scenes?.length || 0})
                </h3>
                <div className="space-y-2">
                  {result.scenes?.map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-gray-500 ml-2">- {s.location}</span>
                      <p className="text-gray-600 mt-1">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.suggested_shots}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">建议镜头数</div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">制作难点</h3>
                <p className="text-sm text-gray-600">{result.difficulties}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">分镜建议</h3>
                <p className="text-sm text-gray-600">{result.shot_advice}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
