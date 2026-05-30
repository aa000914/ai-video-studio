"use client";

import { useState, useEffect } from "react";

export default function CreationDocument({ projectId, onEnterEditor }) {
  const [plan, setPlan] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [charImages, setCharImages] = useState({});
  const [sceneImages, setSceneImages] = useState({});

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [planRes, charRes, sceneRes, shotRes] = await Promise.all([
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
      ]);
      const [p, c, s, sh] = await Promise.all([planRes.json(), charRes.json(), sceneRes.json(), shotRes.json()]);
      setPlan(p.data || null);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      setShots((sh.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0)));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-gray-500">加载策划文档...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">{plan?.summary ? (plan.summary.slice(0, 30) + "...") : "策划文档"}</h2>
          <p className="text-gray-500 text-xs mt-0.5">内容由 AI 生成</p>
        </div>
        <button onClick={loadAll}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-white/10 rounded-lg px-3 py-1.5">
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {/* 1. 剧本 */}
        {plan?.script_text && (
          <Section title="剧本内容">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{plan.script_text}</p>
          </Section>
        )}

        {/* 2. 风格 */}
        {plan && (
          <Section title="美术风格">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {plan.art_style && <KV k="风格" v={plan.art_style} />}
              {plan.aspect_ratio && <KV k="画面比例" v={plan.aspect_ratio} />}
              {plan.music_style && <KV k="音乐风格" v={plan.music_style} />}
              {plan.content_type && <KV k="内容类型" v={plan.content_type} />}
            </div>
          </Section>
        )}

        {/* 3. 主体列表 */}
        {characters.length > 0 && (
          <Section title="主体列表">
            <div className="space-y-3">
              {characters.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3 flex gap-3 items-start">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {c.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.role} · {c.age}</p>
                    {c.personality && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.personality}</p>}
                  </div>
                  {c.subject_image_url && (
                    <img src={c.subject_image_url} alt={c.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 4. 场景列表 */}
        {scenes.length > 0 && (
          <Section title="场景列表">
            <div className="space-y-3">
              {scenes.map((s) => (
                <div key={s.id} className="bg-white/5 rounded-xl p-3">
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.time_period} · {s.style}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 5. 分镜脚本 */}
        {shots.length > 0 && (
          <Section title={`分镜脚本（${shots.length} 个镜头）`}>
            <div className="space-y-3">
              {shots.map((sh) => (
                <div key={sh.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-indigo-400">镜头 {sh.shot_number}</span>
                    <span className="text-xs text-gray-500">{sh.duration}</span>
                  </div>
                  {sh.scene_name && <p className="text-xs text-gray-400">场景：{sh.scene_name}</p>}
                  {sh.visual && <p className="text-xs text-gray-300 mt-1 line-clamp-2">{sh.visual}</p>}
                  {sh.camera && <p className="text-xs text-gray-500 mt-1">运镜：{sh.camera}</p>}
                  {sh.dialogue && <p className="text-xs text-gray-500 mt-0.5">台词：{sh.dialogue}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {!plan && characters.length === 0 && shots.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">暂无策划内容</p>
            <p className="text-gray-600 text-xs mt-1">在首页创建项目后，AI 将自动生成策划文档</p>
          </div>
        )}
      </div>

      {/* Bottom: enter editor */}
      {shots.length > 0 && (
        <div className="px-4 py-4 border-t border-white/5">
          <button type="button" onClick={() => onEnterEditor?.()}
            className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 text-center transition-colors">
            进入分镜编辑器
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div>
      <span className="text-gray-500 text-xs">{k}：</span>
      <span className="text-gray-300 text-xs">{v || "—"}</span>
    </div>
  );
}
