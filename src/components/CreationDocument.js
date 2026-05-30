"use client";

import { useState, useEffect } from "react";

export default function CreationDocument({ projectId, onEnterEditor }) {
  const [plan, setPlan] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track generated images per subject
  const [charImages, setCharImages] = useState({});  // { charId: "url" }
  const [sceneImages, setSceneImages] = useState({}); // { sceneId: "url" }
  const [generating, setGenerating] = useState({});    // { charId: true } or { sceneId: true }
  const [msg, setMsg] = useState("");

  function showMsg(t) { setMsg(t); setTimeout(() => setMsg(""), 3000); }

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [planRes, charRes, sceneRes, shotRes, assetsRes] = await Promise.all([
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/generated-assets?project_id=${projectId}`),
      ]);
      const [p, c, s, sh, a] = await Promise.all([planRes.json(), charRes.json(), sceneRes.json(), shotRes.json(), assetsRes.json()]);
      setPlan(p.data || null);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      setShots((sh.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0)));

      // Restore existing images from assets
      const assets = a.data || [];
      const ci = {}; const si = {};
      assets.forEach((ast) => {
        if (ast.metadata?.subject_type === "character" && ast.metadata?.subject_id) ci[ast.metadata.subject_id] = ast.url;
        if (ast.metadata?.subject_type === "scene" && ast.metadata?.subject_id) si[ast.metadata.subject_id] = ast.url;
      });
      // Also check subject_image_url
      (c.data || []).forEach((ch) => { if (ch.subject_image_url) ci[ch.id] = ch.subject_image_url; });
      (s.data || []).forEach((sc) => { if (sc.subject_image_url) si[sc.id] = sc.subject_image_url; });
      setCharImages(ci); setSceneImages(si);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  // Generate reference image for a character
  async function handleGenCharImage(char) {
    const prompt = char.prompt_front || char.prompt || `${char.name}, ${char.appearance || ""}, ${char.costume || ""} — character reference`;
    if (!prompt.trim()) { showMsg("缺少角色描述，无法生成参考图"); return; }
    setGenerating((p) => ({ ...p, [char.id]: true }));
    try {
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "image", prompt: prompt.trim().slice(0, 600), size: "1024*1024" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      if (data.resultUrl) {
        setCharImages((p) => ({ ...p, [char.id]: data.resultUrl }));
        // Persist to character record so it survives refresh
        try { await fetch(`/api/characters/${char.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_image_url: data.resultUrl }) }); } catch {}
        showMsg(`${char.name} 参考图已生成`);
      } else {
        showMsg(`${char.name} 参考图任务已提交，请稍后刷新查看`);
      }
    } catch (err) { showMsg("生成失败: " + err.message); }
    finally { setGenerating((p) => ({ ...p, [char.id]: false })); }
  }

  async function handleGenSceneImage(scene) {
    const prompt = scene.prompt_front || scene.prompt || `${scene.name}, ${scene.description || ""} — scene reference, ${scene.lighting || ""}`;
    if (!prompt.trim()) { showMsg("缺少场景描述，无法生成场景图"); return; }
    setGenerating((p) => ({ ...p, [scene.id]: true }));
    try {
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "image", prompt: prompt.trim().slice(0, 600), size: "1280*720" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      if (data.resultUrl) {
        setSceneImages((p) => ({ ...p, [scene.id]: data.resultUrl }));
        try { await fetch(`/api/scenes/${scene.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_image_url: data.resultUrl }) }); } catch {}
        showMsg(`${scene.name} 场景图已生成`);
      } else {
        showMsg(`${scene.name} 场景图任务已提交，请稍后刷新查看`);
      }
    } catch (err) { showMsg("生成失败: " + err.message); }
    finally { setGenerating((p) => ({ ...p, [scene.id]: false })); }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-gray-500">加载策划文档...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">策划文档</h2>
          <p className="text-gray-500 text-xs mt-0.5">内容由 AI 生成</p>
        </div>
        <button type="button" onClick={loadAll}
          className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg px-3 py-1.5">
          刷新
        </button>
      </div>

      {msg && <div className="mx-6 mt-3 bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-lg text-xs">{msg}</div>}

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

        {/* 3. 主体列表 + 参考图 */}
        {characters.length > 0 && (
          <Section title={`主体列表（${characters.length}）`}>
            <div className="grid gap-4 md:grid-cols-2">
              {characters.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex gap-3 items-start">
                    {/* Reference image */}
                    {charImages[c.id] ? (
                      <img src={charImages[c.id]} alt={c.name} className="w-20 h-20 rounded-lg object-cover shrink-0 border border-white/10" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-xs shrink-0 border border-white/5">
                        暂无参考图
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.role} · {c.age}</p>
                      {c.personality && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.personality}</p>}
                      {c.appearance && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.appearance}</p>}
                      <button type="button"
                        onClick={() => handleGenCharImage(c)}
                        disabled={generating[c.id]}
                        className="mt-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all">
                        {generating[c.id] ? "生成中..." : charImages[c.id] ? "重新生成" : "生成参考图"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 4. 场景列表 + 场景图 */}
        {scenes.length > 0 && (
          <Section title={`场景列表（${scenes.length}）`}>
            <div className="grid gap-4 md:grid-cols-2">
              {scenes.map((s) => (
                <div key={s.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex gap-3 items-start">
                    {sceneImages[s.id] ? (
                      <img src={sceneImages[s.id]} alt={s.name} className="w-20 h-20 rounded-lg object-cover shrink-0 border border-white/10" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-xs shrink-0 border border-white/5">
                        暂无场景图
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.time_period}</p>
                      {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>}
                      {s.lighting && <p className="text-xs text-gray-500">氛围：{s.lighting}</p>}
                      <button type="button"
                        onClick={() => handleGenSceneImage(s)}
                        disabled={generating[s.id]}
                        className="mt-2 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-all">
                        {generating[s.id] ? "生成中..." : sceneImages[s.id] ? "重新生成" : "生成场景图"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 5. 分镜脚本 */}
        {shots.length > 0 && (
          <Section title={`分镜脚本（${shots.length} 个镜头）`}>
            <div className="space-y-2">
              {shots.map((sh) => (
                <div key={sh.id} className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-3 text-xs">
                  <span className="font-bold text-indigo-400 shrink-0">镜 {sh.shot_number}</span>
                  <span className="text-gray-500">{sh.duration}</span>
                  <span className="text-gray-400 truncate">{sh.scene_name || "—"}</span>
                  <span className="text-gray-500 truncate hidden md:inline">{sh.visual?.slice(0, 40)}{(sh.visual || "").length > 40 ? "..." : ""}</span>
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
