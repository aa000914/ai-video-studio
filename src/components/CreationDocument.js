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
  const [customPrompts, setCustomPrompts] = useState({});
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Add / Edit / Delete state
  const [charForm, setCharForm] = useState(null);     // { mode: "add"|"edit", data: {} }
  const [sceneForm, setSceneForm] = useState(null);   // { mode: "add"|"edit", data: {} }
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: "character"|"scene", id, name }

  function showMsg(t) { setMsg(t); setTimeout(() => setMsg(""), 3000); }

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    try {
      const sf = async (url) => { try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { console.warn("[LOAD_FAIL]", url, e.message); return {}; } };

      const results = await Promise.allSettled([
        sf(`/api/plans?project_id=${projectId}`),
        sf(`/api/characters?project_id=${projectId}`),
        sf(`/api/scenes?project_id=${projectId}`),
        sf(`/api/shots?project_id=${projectId}`),
        sf(`/api/generated-assets?project_id=${projectId}`),
      ]);
      const get = (r) => (r.status === "fulfilled" ? r.value : {});
      const [p, c, s, sh, a] = results.map(get);

      setPlan((p.ok !== false && p.data !== undefined ? p.data : null) || null);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      setShots((sh.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0)));

      const assets = a.data || [];
      const ci = {}; const si = {};
      (c.data || []).forEach((ch) => {
        const url = getSubjectImageUrl(ch, assets);
        if (url) ci[ch.id] = url;
      });
      (s.data || []).forEach((sc) => {
        const url = getSubjectImageUrl(sc, assets);
        if (url) si[sc.id] = url;
      });
      setCharImages(ci); setSceneImages(si);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function getGenPrompt(item, isChar) {
    const custom = customPrompts[item.id];
    if (custom) return custom;
    const savedCN = item.metadata?.prompt_cn || item.visual_prompt_cn || "";
    if (savedCN) return savedCN;
    return isChar ? buildCharPromptCN(item) : buildScenePromptCN(item);
  }

  async function handleGenImage(item, isChar) {
    let prompt = getGenPrompt(item, isChar);
    if (!prompt.trim()) { showMsg("缺少生图提示词，请先编辑"); return; }

    // For character images, ensure full-body requirement
    if (isChar && !prompt.includes("全身完整入镜") && !prompt.includes("全身像")) {
      prompt += "，全身完整入镜，不裁切头部和脚部。";
    }

    setGenerating((p) => ({ ...p, [item.id]: true }));
    try {
      const res = await fetch("/api/generate-reference-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          entity_type: isChar ? "character" : "scene",
          entity_id: item.id,
          entity_name: item.name,
          prompt_cn: prompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      if (data.imageUrl) {
        if (isChar) setCharImages((p) => ({ ...p, [item.id]: data.imageUrl }));
        else setSceneImages((p) => ({ ...p, [item.id]: data.imageUrl }));
        if (onUpdateState) onUpdateState();
        showMsg(`${item.name} ${isChar ? "人物" : "场景"}图已生成`);
      } else if (data.pending) {
        showMsg(`${item.name} 图任务已提交，请稍后刷新`);
      } else {
        showMsg(`${item.name} 生成失败: 未获取到图片`);
      }
    } catch (err) { showMsg("生成失败: " + err.message); }
    finally { setGenerating((p) => ({ ...p, [item.id]: false })); }
  }

  // ---- Character CRUD ----
  async function handleSaveCharacter(data) {
    try {
      if (charForm.mode === "edit") {
        const res = await fetch(`/api/characters/${charForm.data.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name, age: data.age, role: data.role,
            description: data.description, appearance: data.appearance,
            personality: data.personality,
            metadata: { prompt_cn: data.prompt_cn || "" },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "保存失败");
        // Update local state
        setCharacters((prev) => prev.map((c) => c.id === json.data.id ? { ...c, ...json.data } : c));
        showMsg(`人物「${data.name}」已更新`);
      } else {
        const res = await fetch("/api/characters", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            name: data.name, age: data.age, role: data.role,
            description: data.description, appearance: data.appearance,
            personality: data.personality,
            metadata: { prompt_cn: data.prompt_cn || "" },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "创建失败");
        setCharacters((prev) => [...prev, json.data]);
        showMsg(`人物「${data.name}」已新增`);
      }
      setCharForm(null);
      if (onUpdateState) onUpdateState();
    } catch (err) { showMsg("操作失败: " + err.message); }
  }

  async function handleDeleteCharacter(id, name) {
    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "删除失败");
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      showMsg(`人物「${name}」已移除`);
      setConfirmDelete(null);
      if (onUpdateState) onUpdateState();
    } catch (err) { showMsg("删除失败: " + err.message); }
  }

  // ---- Scene CRUD ----
  async function handleSaveScene(data) {
    try {
      if (sceneForm.mode === "edit") {
        const res = await fetch(`/api/scenes/${sceneForm.data.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name, time_period: data.time_period,
            description: data.description, lighting: data.lighting,
            visual_style: data.visual_style,
            metadata: { prompt_cn: data.prompt_cn || "" },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "保存失败");
        setScenes((prev) => prev.map((s) => s.id === json.data.id ? { ...s, ...json.data } : s));
        showMsg(`场景「${data.name}」已更新`);
      } else {
        const res = await fetch("/api/scenes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            name: data.name, time_period: data.time_period,
            description: data.description, lighting: data.lighting,
            visual_style: data.visual_style,
            metadata: { prompt_cn: data.prompt_cn || "" },
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "创建失败");
        setScenes((prev) => [...prev, json.data]);
        showMsg(`场景「${data.name}」已新增`);
      }
      setSceneForm(null);
      if (onUpdateState) onUpdateState();
    } catch (err) { showMsg("操作失败: " + err.message); }
  }

  async function handleDeleteScene(id, name) {
    try {
      const res = await fetch(`/api/scenes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "删除失败");
      setScenes((prev) => prev.filter((s) => s.id !== id));
      showMsg(`场景「${name}」已移除`);
      setConfirmDelete(null);
      if (onUpdateState) onUpdateState();
    } catch (err) { showMsg("删除失败: " + err.message); }
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

      <div className="flex-1 overflow-auto px-6 py-5 space-y-8">
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

        {/* ===== 人物列表 ===== */}
        <Section title={`人物列表（${characters.length}）`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">管理故事角色及其参考图</p>
            <button type="button" onClick={() => setCharForm({ mode: "add", data: {} })}
              className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              + 新增人物
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              <p className="text-gray-600 text-sm">暂无人物，点击上方按钮新增</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {characters.map((c) => {
                const hasImage = !!charImages[c.id];
                const isGenerating = !!generating[c.id];
                const genBtnLabel = isGenerating ? "生成中..." : hasImage ? "重新生成" : "生成人物图";
                return (
                  <div key={c.id} className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
                    {/* Large image area — object-contain, 420-480px height */}
                    {hasImage ? (
                      <div className="relative cursor-pointer group bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950"
                        onClick={() => setPreviewImage({
                          url: charImages[c.id],
                          name: c.name,
                          prompt: getGenPrompt(c, true),
                          model: "wan2.7-image-pro",
                          typeLabel: "人物",
                          time: new Date().toLocaleString("zh-CN"),
                        })}>
                        <img src={charImages[c.id]} alt={c.name}
                          className="w-full h-[420px] max-h-[480px] object-contain mx-auto" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="text-white/0 group-hover:text-white/70 text-sm font-medium transition-all">点击放大预览</span>
                        </div>
                      </div>
                    ) : isGenerating ? (
                      <div className="w-full h-[420px] bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">正在生成人物图...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[280px] bg-gradient-to-b from-gray-900/50 to-gray-950/50 flex items-center justify-center border-b border-white/[0.04]">
                        <div className="text-center">
                          <div className="text-4xl mb-2 opacity-30">👤</div>
                          <p className="text-gray-600 text-sm">暂无参考图</p>
                          <p className="text-gray-700 text-xs mt-1">点击下方「生成人物图」创建</p>
                        </div>
                      </div>
                    )}

                    {/* Character info */}
                    <div className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{c.role || "角色"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {c.age && <span>{c.age}岁</span>}
                        {c.description && <span className="truncate">{c.description}</span>}
                        {!c.description && c.personality && <span className="truncate">{c.personality}</span>}
                      </div>
                      {customPrompts[c.id] && (
                        <p className="text-[10px] text-gray-600 italic line-clamp-1">自定义提示词已启用</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button type="button"
                        onClick={() => setEditingPrompt({ type: "character", id: c.id, name: c.name, current: getGenPrompt(c, true) })}
                        className="text-[11px] text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                        编辑提示词
                      </button>
                      <button type="button"
                        onClick={() => handleGenImage(c, true)}
                        disabled={isGenerating}
                        className="text-[11px] bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium">
                        {genBtnLabel}
                      </button>
                      <button type="button"
                        onClick={() => setCharForm({ mode: "edit", data: c })}
                        className="text-[11px] text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                        编辑
                      </button>
                      <button type="button"
                        onClick={() => setConfirmDelete({ type: "character", id: c.id, name: c.name })}
                        className="text-[11px] text-red-400/70 border border-red-400/20 rounded-lg px-2.5 py-1.5 hover:bg-red-500/10 transition-colors">
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ===== 场景列表 ===== */}
        <Section title={`场景列表（${scenes.length}）`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">管理故事场景及其参考图</p>
            <button type="button" onClick={() => setSceneForm({ mode: "add", data: {} })}
              className="bg-teal-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors font-medium">
              + 新增场景
            </button>
          </div>

          {scenes.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              <p className="text-gray-600 text-sm">暂无场景，点击上方按钮新增</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {scenes.map((s) => {
                const hasImage = !!sceneImages[s.id];
                const isGenerating = !!generating[s.id];
                const genBtnLabel = isGenerating ? "生成中..." : hasImage ? "重新生成" : "生成场景图";
                return (
                  <div key={s.id} className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors">
                    {/* Large scene image — 16:9, 260px min height */}
                    {hasImage ? (
                      <div className="relative cursor-pointer group bg-black/40"
                        onClick={() => setPreviewImage({
                          url: sceneImages[s.id],
                          name: s.name,
                          prompt: getGenPrompt(s, false),
                          model: "wan2.7-image-pro",
                          typeLabel: "场景",
                          time: new Date().toLocaleString("zh-CN"),
                        })}>
                        <div className="aspect-[16/9] w-full">
                          <img src={sceneImages[s.id]} alt={s.name}
                            className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="text-white/0 group-hover:text-white/70 text-sm font-medium transition-all">点击放大预览</span>
                        </div>
                      </div>
                    ) : isGenerating ? (
                      <div className="w-full aspect-[16/9] bg-black/40 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">正在生成场景图...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-black/30 flex items-center justify-center border-b border-white/[0.04]">
                        <div className="text-center">
                          <div className="text-4xl mb-2 opacity-30">🏞</div>
                          <p className="text-gray-600 text-sm">暂无场景图</p>
                          <p className="text-gray-700 text-xs mt-1">点击下方「生成场景图」创建</p>
                        </div>
                      </div>
                    )}

                    {/* Scene info */}
                    <div className="px-4 py-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{s.time_period || "—"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {s.description && <span className="truncate">{s.description}</span>}
                        {s.lighting && <span>氛围：{s.lighting}</span>}
                      </div>
                      {customPrompts[s.id] && (
                        <p className="text-[10px] text-gray-600 italic line-clamp-1">自定义提示词已启用</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button type="button"
                        onClick={() => setEditingPrompt({ type: "scene", id: s.id, name: s.name, current: getGenPrompt(s, false) })}
                        className="text-[11px] text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                        编辑提示词
                      </button>
                      <button type="button"
                        onClick={() => handleGenImage(s, false)}
                        disabled={isGenerating}
                        className="text-[11px] bg-teal-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium">
                        {genBtnLabel}
                      </button>
                      <button type="button"
                        onClick={() => setSceneForm({ mode: "edit", data: s })}
                        className="text-[11px] text-gray-400 border border-white/10 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                        编辑
                      </button>
                      <button type="button"
                        onClick={() => setConfirmDelete({ type: "scene", id: s.id, name: s.name })}
                        className="text-[11px] text-red-400/70 border border-red-400/20 rounded-lg px-2.5 py-1.5 hover:bg-red-500/10 transition-colors">
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

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

      {/* ===== Prompt Edit Modal ===== */}
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

      {/* ===== Character Form Modal (Add/Edit) ===== */}
      {charForm && (
        <CharacterFormModal
          mode={charForm.mode}
          initialData={charForm.data}
          onClose={() => setCharForm(null)}
          onSave={handleSaveCharacter}
        />
      )}

      {/* ===== Scene Form Modal (Add/Edit) ===== */}
      {sceneForm && (
        <SceneFormModal
          mode={sceneForm.mode}
          initialData={sceneForm.data}
          onClose={() => setSceneForm(null)}
          onSave={handleSaveScene}
        />
      )}

      {/* ===== Confirm Delete Modal ===== */}
      {confirmDelete && (
        <ConfirmModal
          title={`确定删除${confirmDelete.type === "character" ? "人物" : "场景"}【${confirmDelete.name}】吗？`}
          message="已生成的图片资产会保留在资产库，但该条目将从当前策划文档中移除。"
          confirmLabel="确认删除"
          onConfirm={() => {
            if (confirmDelete.type === "character") handleDeleteCharacter(confirmDelete.id, confirmDelete.name);
            else handleDeleteScene(confirmDelete.id, confirmDelete.name);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ===== Image Preview Modal ===== */}
      {previewImage && (
        <ImagePreviewModal
          url={previewImage.url}
          name={previewImage.name}
          prompt={previewImage.prompt}
          model={previewImage.model}
          typeLabel={previewImage.typeLabel}
          time={previewImage.time}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

// ===== Sub-components =====

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

// ===== Character Add/Edit Modal =====
function CharacterFormModal({ mode, initialData, onClose, onSave }) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    age: initialData?.age || "",
    role: initialData?.role || "",
    description: initialData?.description || "",
    appearance: initialData?.appearance || "",
    personality: initialData?.personality || "",
    prompt_cn: initialData?.metadata?.prompt_cn || "",
  });
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 my-8"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">{mode === "add" ? "新增人物" : "编辑人物"}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <FormField label="人物名称" value={form.name} onChange={(v) => set("name", v)} placeholder="如：林夜" required />
          <FormField label="年龄" value={form.age} onChange={(v) => set("age", v)} placeholder="如：28" />
          <FormField label="角色身份" value={form.role} onChange={(v) => set("role", v)} placeholder="如：男主角 / 星际探索者" />
          <FormField label="人物描述" value={form.description} onChange={(v) => set("description", v)} placeholder="人物整体描述" textarea />
          <FormField label="外貌设定" value={form.appearance} onChange={(v) => set("appearance", v)} placeholder="身高、体型、发型、面部特征等" textarea />
          <FormField label="性格设定" value={form.personality} onChange={(v) => set("personality", v)} placeholder="性格特点" textarea />
          <FormField label="生图提示词 prompt_cn" value={form.prompt_cn} onChange={(v) => set("prompt_cn", v)} placeholder="AI 生成人物图时使用的提示词" textarea />
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-white/10 text-gray-300 py-2 rounded-lg text-sm hover:bg-white/5">取消</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Scene Add/Edit Modal =====
function SceneFormModal({ mode, initialData, onClose, onSave }) {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    time_period: initialData?.time_period || "",
    description: initialData?.description || "",
    lighting: initialData?.lighting || "",
    visual_style: initialData?.visual_style || "",
    prompt_cn: initialData?.metadata?.prompt_cn || "",
  });
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm((p) => ({ ...p, [key]: val })); }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm overflow-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-white/10 my-8"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">{mode === "add" ? "新增场景" : "编辑场景"}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <FormField label="场景名称" value={form.name} onChange={(v) => set("name", v)} placeholder="如：星辰号舰桥" required />
          <FormField label="时间 / 时代" value={form.time_period} onChange={(v) => set("time_period", v)} placeholder="如：2157年 / 未来" />
          <FormField label="场景描述" value={form.description} onChange={(v) => set("description", v)} placeholder="场景整体描述" textarea />
          <FormField label="氛围" value={form.lighting} onChange={(v) => set("lighting", v)} placeholder="如：昏暗 / 明亮 / 阴森" />
          <FormField label="视觉风格" value={form.visual_style} onChange={(v) => set("visual_style", v)} placeholder="如：赛博朋克 / 写实" />
          <FormField label="生图提示词 prompt_cn" value={form.prompt_cn} onChange={(v) => set("prompt_cn", v)} placeholder="AI 生成场景图时使用的提示词" textarea />
        </div>
        <div className="px-5 py-4 border-t border-white/10 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-white/10 text-gray-300 py-2 rounded-lg text-sm hover:bg-white/5">取消</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Form Field =====
function FormField({ label, value, onChange, placeholder, textarea, required }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 font-medium mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)}
          rows={3} placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      )}
    </div>
  );
}

// ===== Confirm Delete Modal =====
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-sm font-semibold mb-2">{title}</p>
        <p className="text-gray-400 text-xs leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onCancel}
            className="flex-1 border border-white/10 text-gray-300 py-2 rounded-lg text-sm hover:bg-white/5">取消</button>
          <button type="button" onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">删除</button>
        </div>
      </div>
    </div>
  );
}
