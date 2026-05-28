"use client";

import { useState, useEffect } from "react";

export default function SubjectsPage() {
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("characters");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { loadSubjects(); }, []);

  async function loadSubjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      const json = await res.json();
      if (res.ok) {
        setCharacters(json.data?.characters || []);
        setScenes(json.data?.scenes || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function copyText(text, id) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = activeTab === "characters" ? characters : scenes;
  const isEmpty = data.length === 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">主体库</h1>
          <p className="text-sm text-gray-500 mt-1">跨项目的角色和场景资产沉淀</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b">
          <button
            onClick={() => setActiveTab("characters")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "characters"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            角色主体库 ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab("scenes")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "scenes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            场景主体库 ({scenes.length})
          </button>
        </div>

        {isEmpty ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="font-semibold text-gray-900 mb-2">暂无主体数据</h3>
            <p className="text-sm text-gray-500">创建项目并生成角色/场景后，数据将自动汇集到此</p>
          </div>
        ) : activeTab === "characters" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <div key={c.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{c.name}</h4>
                    <p className="text-xs text-gray-400">{c.projects?.title || c.role || "—"}</p>
                  </div>
                </div>
                {c.prompt && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-700 font-mono leading-relaxed line-clamp-3">{c.prompt}</p>
                  </div>
                )}
                <button
                  onClick={() => copyText(
                    `【${c.name}】${c.role ? ` (${c.role})` : ""}\n提示词：${c.prompt || "—"}\n禁止变化点：${c.prohibited_changes || "—"}`,
                    c.id
                  )}
                  className="w-full border border-blue-200 text-blue-600 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-50"
                >
                  {copiedId === c.id ? "已复制" : "复制提示词"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenes.map((s) => (
              <div key={s.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    🏛
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{s.name}</h4>
                    <p className="text-xs text-gray-400">{s.projects?.title || s.location || "—"}</p>
                  </div>
                </div>
                {s.prompt && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-3">
                    <p className="text-xs text-green-700 font-mono leading-relaxed line-clamp-3">{s.prompt}</p>
                  </div>
                )}
                <button
                  onClick={() => copyText(
                    `【${s.name}】${s.location ? ` - ${s.location}` : ""}\n提示词：${s.prompt || "—"}\n禁止元素：${s.prohibited_elements || "—"}`,
                    s.id
                  )}
                  className="w-full border border-green-200 text-green-600 py-1.5 rounded-lg text-xs font-medium hover:bg-green-50"
                >
                  {copiedId === s.id ? "已复制" : "复制提示词"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
