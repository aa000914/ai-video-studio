"use client";

import { useState, useEffect } from "react";
import ImagePreviewModal from "./ImagePreviewModal";
import { getSubjectImageUrl, resolveAssetUrl, buildCharPromptCN, buildScenePromptCN } from "@/lib/asset-resolver";

export default function CreationDocument({ projectId, onEnterEditor, onUpdateState }) {
  const [plan, setPlan] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [charImages, setCharImages] = useState({});
  const [sceneImages, setSceneImages] = useState({});
  const [generating, setGenerating] = useState({});
  const [msg, setMsg] = useState("");
  // Custom prompts
  const [customPrompts, setCustomPrompts] = useState({}); // { charId: "custom prompt", sceneId: "custom prompt" }
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // { url, name, prompt, model }

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

      const assets = a.data || [];
      const ci = {}; const si = {};
      // Resolve images using unified resolver
      (c.data || []).forEach((ch) => {
        const url = getSubjectImageUrl(ch, assets);
        if (url) ci[ch.id] = url;
        console.log("[CHAR_IMAGE_RESOLVE]", ch.name, "subject_image_url=" + ch.subject_image_url, "resolved=" + (url ? url.slice(0, 60) + "..." : "MISSING"));
      });
      (s.data || []).forEach((sc) => {
        const url = getSubjectImageUrl(sc, assets);
        if (url) si[sc.id] = url;
        console.log("[SCENE_IMAGE_RESOLVE]", sc.name, "subject_image_url=" + sc.subject_image_url, "resolved=" + (url ? url.slice(0, 60) + "..." : "MISSING"));
      });
      setCharImages(ci); setSceneImages(si);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function getGenPrompt(item, isChar) {
    const custom = customPrompts[item.id];
    if (custom) return custom;
    // Use metadata.prompt_cn or build from attributes
    const savedCN = item.metadata?.prompt_cn || item.visual_prompt_cn || "";
    if (savedCN) return savedCN;
    return isChar ? buildCharPromptCN(item) : buildScenePromptCN(item);
  }

  async function handleGenImage(item, isChar) {
    const prompt = getGenPrompt(item, isChar);
    if (!prompt.trim()) { showMsg("缺少生图提示词，请先编辑"); return; }
    setGenerating((p) => ({ ...p, [item.id]: true }));
    try {
      const size = isChar ? "1024*1024" : "1280*720";
      const res = await fetch("/api/generation/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "image", prompt: prompt.trim().slice(0, 600), size }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      if (data.resultUrl) {
        if (isChar) setCharImages((p) => ({ ...p, [item.id]: data.resultUrl }));
        else setSceneImages((p) => ({ ...p, [item.id]: data.resultUrl }));

        // Persist: write subject_image_url to character/scene record
        const endpoint = isChar ? `/api/characters/${item.id}` : `/api/scenes/${item.id}`;
        try {
          const putRes = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject_image_url: data.resultUrl }) });
          if (!putRes.ok) console.error("[PERSIST_IMAGE_FAILED]", endpoint, putRes.status);
          else console.log("[PERSIST_IMAGE_OK]", item.name, data.resultUrl?.slice(0, 60));
        } catch (e) { console.error("[PERSIST_IMAGE_ERROR]", endpoint, e); }

        if (onUpdateState) onUpdateState();
        showMsg(`${item.name} ${isChar ? "人物" : "场景"}图已生成`);
      } else {
        showMsg(`${item.name} 图任务已提交，请稍后刷新`);
      }
    } catch (err) { showMsg("生成失败: " + err.message); }
    finally { setGenerating((p) => ({ ...p, [item.id]: false })); }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-gray-500">加载策划文档...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">策划文档</h2>
          <p className="text-gray-500 text-xs mt-0.5">内容由 AI 生成</p>
        </div>
        <button type="button" onClick={loadAll}
          className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg px-3 py-1.5">刷新</button>
      </div>

      {msg && <div className="mx-6 mt-3 bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-lg text-xs">{msg}</div>}

      <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
        {plan?.script_text && (
          <Section title="剧本内容">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{plan.script_text}</p>
          </Section>
        )}

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

        {/* 人物列表 */}
        {characters.length > 0 && (
          <Section title={`人物列表（${characters.length}）`}>
            <div className="grid gap-4 md:grid-cols-2">
              {characters.map((c) => (
                <div key={c.id} className="bg-white/5 rounded-xl p-4">
                  {/* Big image area */}
                  {charImages[c.id] ? (
                    <div className="relative cursor-pointer group mb-3" onClick={() => setPreviewImage({ url: charImages[c.id], name: c.name, prompt: getGenPrompt(c, true), model: "qwen-image-2.0-pro" })}>
                      <img src={charImages[c.id]} alt={c.name} className="w-full h-64 object-cover rounded-xl border border-white/10 group-hover:border-indigo-500 transition-colors" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity">点击放大</span>
                      </div>
                    </div>
                  ) : generating[c.id] ? (
                    <div className="w-full h-64 rounded-xl bg-white/5 flex items-center justify-center mb-3 border border-white/5">
                      <div className="text-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-gray-500 text-xs">生成中...</p></div>
                    </div>
                  ) : (
                    <div className="w-full h-48 rounded-xl bg-white/5 flex items-center justify-center mb-3 border border-white/5">
                      <p className="text-gray-600 text-sm">暂无参考图</p>
                    </div>
                  )}
                  {/* Info */}
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.role} · {c.age}</p>
                  {c.personality && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{c.personality}</p>}
                  {customPrompts[c.id] && <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">提示词：{customPrompts[c.id]}</p>}
                  <div className="flex gap-2 mt-2">
                    <button type="button"
                      onClick={() => setEditingPrompt({ type: "character", id: c.id, name: c.name, current: getGenPrompt(c, true) })}
                      className="text-xs text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 flex-1">编辑提示词</button>
                    <button type="button"
                      onClick={() => handleGenImage(c, true)}
                      disabled={generating[c.id]}
                      className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50 flex-1">
                      {generating[c.id] ? "生成中..." : "生成人物图"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 场景列表 */}
        {scenes.length > 0 && (
          <Section title={`场景列表（${scenes.length}）`}>
            <div className="grid gap-4 md:grid-cols-2">
              {scenes.map((s) => (
                <div key={s.id} className="bg-white/5 rounded-xl p-4">
                  {sceneImages[s.id] ? (
                    <div className="relative cursor-pointer group mb-3" onClick={() => setPreviewImage({ url: sceneImages[s.id], name: s.name, prompt: getGenPrompt(s, false), model: "qwen-image-2.0-pro" })}>
                      <img src={sceneImages[s.id]} alt={s.name} className="w-full h-44 object-cover rounded-xl border border-white/10 group-hover:border-teal-500 transition-colors" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity">点击放大</span>
                      </div>
                    </div>
                  ) : generating[s.id] ? (
                    <div className="w-full h-44 rounded-xl bg-white/5 flex items-center justify-center mb-3 border border-white/5">
                      <div className="text-center"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" /><p className="text-gray-500 text-xs">生成中...</p></div>
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl bg-white/5 flex items-center justify-center mb-3 border border-white/5">
                      <p className="text-gray-600 text-sm">暂无场景图</p>
                    </div>
                  )}
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.time_period}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{s.description}</p>}
                  {customPrompts[s.id] && <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">提示词：{customPrompts[s.id]}</p>}
                  <div className="flex gap-2 mt-2">
                    <button type="button"
                      onClick={() => setEditingPrompt({ type: "scene", id: s.id, name: s.name, current: getGenPrompt(s, false) })}
                      className="text-xs text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 flex-1">编辑提示词</button>
                    <button type="button"
                      onClick={() => handleGenImage(s, false)}
                      disabled={generating[s.id]}
                      className="bg-teal-600 text-white px-2.5 py-1.5 rounded-lg text-xs hover:bg-teal-700 disabled:opacity-50 flex-1">
                      {generating[s.id] ? "生成中..." : "生成场景图"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

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

      {shots.length > 0 && (
        <div className="px-4 py-4 border-t border-white/5">
          <button type="button" onClick={() => onEnterEditor?.()}
            className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 text-center transition-colors">
            进入分镜编辑器
          </button>
        </div>
      )}

      {/* Prompt Edit Modal */}
      {editingPrompt && (
        <PromptEditModal
          title={`编辑 ${editingPrompt.name} 生图提示词`}
          initialPrompt={editingPrompt.current}
          onClose={() => setEditingPrompt(null)}
          onSave={(v) => {
            setCustomPrompts((p) => ({ ...p, [editingPrompt.id]: v }));
            const endpoint = editingPrompt.type === "character" ? `/api/characters/${editingPrompt.id}` : `/api/scenes/${editingPrompt.id}`;
            try {
              fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: v, metadata: { prompt_cn: v } }) });
            } catch (e) { console.error("PUT prompt error:", e); }
            setEditingPrompt(null);
          }}
        />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          url={previewImage.url}
          name={previewImage.name}
          prompt={previewImage.prompt}
          model={previewImage.model}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

function Section({ title, children }) {
  return <div><h3 className="text-sm font-semibold text-white mb-3">{title}</h3>{children}</div>;
}

function KV({ k, v }) {
  return <div><span className="text-gray-500 text-xs">{k}：</span><span className="text-gray-300 text-xs">{v || "—"}</span></div>;
}

function PromptEditModal({ title, initialPrompt, onClose, onSave }) {
  const [val, setVal] = useState(initialPrompt || "");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-white/10"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>
        <div className="px-5 py-4">
          <textarea value={val} onChange={(e) => setVal(e.target.value)}
            rows={5} placeholder="输入生图提示词..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-white/10 text-gray-300 py-2 rounded-lg text-sm hover:bg-white/5">取消</button>
          <button type="button" onClick={() => onSave(val)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">保存</button>
        </div>
      </div>
    </div>
  );
}
