"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Plus, Play, ChevronDown, Star, Trash2, ExternalLink,
  Upload, Wand2, ArrowRight, Lightbulb, Shapes, Film, Package,
  FileText, MessageSquare, Monitor, Grid3X3, Tv, Palette,
} from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";

// ============ Constants ============
const CONTENT_TYPES = ["短剧", "音乐MV", "知识分享", "历史文化"];
const MODES = ["AI 策划", "对话剧情", "旁白解说"];
const ASPECT_RATIOS = ["9:16", "16:9", "3:4", "4:3"];
const STORYBOARD_COUNTS = [6, 12, 18, 24, 30];
const EPISODE_COUNTS = [1, 3, 5, 10];
const ART_STYLES = ["电影质感", "写实", "国漫", "二次元", "赛博朋克"];

const PLACEHOLDER = "例如：一个发生在未来海上城市的科幻故事，主角是一名记忆修复师，风格偏赛博朋克……";

// New inspiration copy — fills textarea when user clicks "使用这个灵感"
const INSPIRATION_TEXTS = {
  "秦朝穿越短剧": "一个现代青年穿越到秦朝的历史短剧，卷入谋士与天下之争，画风史诗、电影感、历史厚重。",
  "末日穹顶城市": "人类生活在末日后的巨大穹顶城市中，外界荒芜危险，穹顶之下隐藏着关于生存和权力的秘密，冷蓝科幻电影质感。",
  "文博青花瓷复原": "一部关于青花瓷数字复原的文博纪录片，展现文物修复师、AI 技术与千年工艺之美，画面安静、细腻、高级。",
};

const DEMO_PROJECTS = [
  { title: "秦朝穿越短剧", tags: "短剧 · 历史", description: "现代青年穿越秦朝，卷入谋士与天下之争", rating: "9.4", imagePath: "/inspirations/qin-travel-drama.png", fallbackGradient: "linear-gradient(135deg, #3b1d0f, #b45309, #111827)" },
  { title: "末日穹顶城市", tags: "短剧 · 科幻", description: "人类最后的庇护所，穹顶之下的生存博弈", rating: "9.2", imagePath: "/inspirations/doomsday-dome-city.png", fallbackGradient: "linear-gradient(135deg, #0f172a, #1e3a8a, #94a3b8)" },
  { title: "文博青花瓷复原", tags: "纪录片 · 文博", description: "AI 助力文物数字复原，重现千年工艺之美", rating: "9.6", imagePath: "/inspirations/qinghua-restoration.png", fallbackGradient: "linear-gradient(135deg, #eff6ff, #1d4ed8, #0f172a)" },
];

const FEATURE_CARDS = [
  { icon: Lightbulb, title: "灵感策划", desc: "从灵感到完整策划案，AI 帮你梳理故事脉络", gradient: "from-purple-500 to-violet-600", bg: "rgba(139,92,246,0.1)" },
  { icon: Shapes, title: "主体一致性", desc: "多模态角色建模，保持角色形象统一", gradient: "from-blue-500 to-indigo-600", bg: "rgba(59,130,246,0.1)" },
  { icon: Film, title: "分镜执行", desc: "AI 生成分镜画面，镜头语言精准落地", gradient: "from-emerald-500 to-teal-600", bg: "rgba(16,185,129,0.1)" },
  { icon: Package, title: "交付导出", desc: "一键导出多种格式，满足平台发布需求", gradient: "from-orange-500 to-amber-600", bg: "rgba(251,146,60,0.1)" },
];

const CONFIG_ITEMS = [
  { key: "contentType", label: "内容类型", icon: FileText, options: CONTENT_TYPES, displayMap: (v) => v },
  { key: "mode", label: "创作模式", icon: MessageSquare, options: MODES, displayMap: (v) => v },
  { key: "aspectRatio", label: "画面比例", icon: Monitor, options: ASPECT_RATIOS, displayMap: (v) => v },
  { key: "storyboardCount", label: "分镜数量", icon: Grid3X3, options: STORYBOARD_COUNTS, displayMap: (v) => `${v} 镜` },
  { key: "episodeCount", label: "剧集模式", icon: Tv, options: EPISODE_COUNTS, displayMap: (v) => v === 1 ? "单集短剧" : `多集 (${v}集)` },
  { key: "artStyle", label: "画风", icon: Palette, options: ART_STYLES, displayMap: (v) => v },
];

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #312e81, #6366f1)",
  "linear-gradient(135deg, #1e3a8a, #06b6d4)",
  "linear-gradient(135deg, #7c2d12, #f97316)",
  "linear-gradient(135deg, #064e3b, #14b8a6)",
  "linear-gradient(135deg, #831843, #a855f7)",
  "linear-gradient(135deg, #0f172a, #3b82f6)",
];

function getCoverGradient(title) {
  const sum = [...(title || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

// ============ Config Pill ============
function ConfigPill({ icon: Icon, label, value, options, displayMap, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex flex-col items-start justify-center text-left transition-all hover:bg-white/[0.08]"
        style={{
          width: "150px", height: "64px", padding: "10px 16px", borderRadius: "16px",
          background: "rgba(15,23,42,0.72)",
          border: open ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.16)",
          boxShadow: open ? "0 0 0 1px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.2)" : "0 12px 30px rgba(0,0,0,0.22)",
        }}
      >
        <div className="flex items-center gap-1.5 w-full">
          <Icon size={11} className="text-gray-500 shrink-0" />
          <span className="text-[10px] text-gray-500 leading-none">{label}</span>
          <ChevronDown size={10} className={`text-gray-500 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <span className="text-[13px] text-white font-medium leading-tight mt-0.5">
          {displayMap ? displayMap(value) : value}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 w-full z-20 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(20px)" }}>
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-all ${isSelected ? "text-white bg-white/[0.08]" : "text-gray-400 hover:text-white hover:bg-white/[0.04]"}`}>
                  {displayMap ? displayMap(opt) : opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============ Main Component ============
export default function HomePageClient({ initialProjects, initialError }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("短剧");
  const [mode, setMode] = useState("AI 策划");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storyboardCount, setStoryboardCount] = useState(12);
  const [episodeCount, setEpisodeCount] = useState(1);
  const [artStyle, setArtStyle] = useState("电影质感");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [projects, setProjects] = useState(initialProjects);
  const [activeTab, setActiveTab] = useState("projects");
  const [deletingId, setDeletingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState("");

  const demoTabActive = activeTab === "inspiration";

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  function getValue(key) {
    const map = { contentType, mode, aspectRatio, storyboardCount, episodeCount, artStyle };
    return map[key];
  }

  function setValue(key, val) {
    const setters = { contentType: setContentType, mode, aspectRatio: setAspectRatio, storyboardCount: setStoryboardCount, episodeCount: setEpisodeCount, artStyle: setArtStyle };
    setters[key](val);
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setError("请输入故事灵感"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auto-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), content_type: contentType, mode, aspect_ratio: aspectRatio, storyboard_count: storyboardCount, art_style: artStyle, episode_count: episodeCount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");
      if (json.data?.parseError) { setError("AI输出格式异常，请重试"); return; }
      router.push(`/projects/${json.data.project.id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleUseInspiration(demoTitle) {
    const text = INSPIRATION_TEXTS[demoTitle];
    if (text) {
      setPrompt(text);
      setActiveTab("projects");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleCreateProject(newProject) {
    setProjects((prev) => [newProject, ...prev]);
    setShowCreateModal(false);
    router.push(`/projects/${newProject.id}`);
  }

  async function handleDeleteProject(projectId) {
    if (deletingId !== projectId) { setDeletingId(projectId); return; }
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeletingId(null);
    } catch (err) { setError(err.message); setDeletingId(null); }
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FC" }}>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden" style={{
        minHeight: "560px", padding: "56px 56px 72px",
        background: `
          radial-gradient(circle at 50% 35%, rgba(99,102,241,0.35), transparent 30%),
          radial-gradient(circle at 30% 60%, rgba(168,85,247,0.35), transparent 35%),
          radial-gradient(circle at 75% 55%, rgba(59,130,246,0.25), transparent 35%),
          linear-gradient(135deg, #0B1028 0%, #111847 45%, #060B18 100%)
        `,
      }}>
        {/* Light beam */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute" style={{
            width: "700px", height: "200px",
            background: "linear-gradient(90deg, rgba(139,92,246,0.35), transparent)",
            top: "20%", left: "15%", transform: "rotate(-8deg)",
            filter: "blur(80px)", opacity: 0.5,
          }} />
        </div>

        {/* Top-right actions */}
        <div className="absolute top-6 right-8 flex items-center gap-3 z-10">
          <button onClick={() => showToast("教程指南正在准备中")}
            className="text-xs text-white/70 px-4 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.08]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)" }}>
            教程指南
          </button>
          <button onClick={() => showToast("新手引导正在准备中")}
            className="text-xs text-white/70 px-4 py-2 rounded-xl transition-all hover:text-white hover:bg-white/[0.08]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)" }}>
            新手引导
          </button>
        </div>

        {/* Hero content */}
        <div className="relative max-w-[1120px] mx-auto text-center">
          <h1 className="text-white font-extrabold leading-tight" style={{
            fontSize: "56px", letterSpacing: "-0.03em",
            background: "linear-gradient(90deg, #fff, #e9ddff, #bfd7ff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            有什么新的故事灵感？<span className="inline-block" style={{ WebkitTextFillColor: "initial" }}> ✨</span>
          </h1>

          <p className="text-[18px] mt-4" style={{ color: "rgba(255,255,255,0.78)", maxWidth: "700px", margin: "16px auto 0" }}>
            输入你的故事灵感、风格和分镜要求，AI 将为你生成策划案、角色、场景和分镜
          </p>

          {/* Input Card */}
          <div className="mx-auto mt-7 text-left" style={{
            maxWidth: "1120px", borderRadius: "24px", background: "rgba(16,24,52,0.72)",
            border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            backdropFilter: "blur(18px)",
          }}>
            <textarea id="story-input" value={prompt} onChange={(e) => { if (e.target.value.length <= 2000) setPrompt(e.target.value); }}
              placeholder={PLACEHOLDER}
              className="w-full bg-transparent border-none text-white placeholder-[#8B8FA3] focus:outline-none resize-none"
              style={{ height: "120px", padding: "28px", fontSize: "15px", lineHeight: "1.7" }}
            />
            <div className="flex items-center justify-between px-7 pb-4">
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Upload size={12} /> 上传参考
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Wand2 size={12} /> AI 智能扩写
                </button>
              </div>
              <span className="text-[11px] text-gray-600">{prompt.length} / 2000</span>
            </div>
          </div>

          {/* Config Pills */}
          <div className="flex gap-3 justify-center flex-wrap mt-4">
            {CONFIG_ITEMS.map((item) => (
              <ConfigPill key={item.key} icon={item.icon} label={item.label} value={getValue(item.key)}
                options={item.options} displayMap={item.displayMap} onChange={(val) => setValue(item.key, val)} />
            ))}
          </div>

          {/* Main Button */}
          <div className="mt-6 flex justify-center">
            <button onClick={handleGenerate} disabled={loading}
              className="text-white text-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ width: "420px", height: "64px", borderRadius: "18px", background: "linear-gradient(90deg, #a855f7, #3b82f6)", boxShadow: "0 16px 40px rgba(99,102,241,0.35)" }}>
              {loading ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 正在生成策划案...</>
              ) : (
                <><Sparkles size={20} /> AI 生成策划案</>
              )}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </section>

      {/* ===== WHITE CONTENT SECTION ===== */}
      <section className="relative" style={{ background: "#F7F8FC", padding: "0 56px 80px" }}>
        {/* Feature Cards */}
        <div className="max-w-[1280px] mx-auto" style={{ transform: "translateY(-44px)" }}>
          <div className="grid grid-cols-4 gap-6">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex items-center gap-4 transition-all hover:-translate-y-0.5 cursor-default"
                  style={{ height: "112px", borderRadius: "22px", background: "white", padding: "24px", boxShadow: "0 18px 45px rgba(15,23,42,0.10)", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-[#0f172a]">{card.title}</h3>
                    <p className="text-[12.5px] text-[#64748b] mt-0.5 leading-relaxed">{card.desc}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs + Gallery */}
        <div className="max-w-[1280px] mx-auto" style={{ marginTop: "-16px" }}>
          {/* Tabs */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-8">
              <button onClick={() => setActiveTab("inspiration")}
                className="relative pb-2 text-[20px] font-bold transition-all"
                style={{ color: demoTabActive ? "#0f172a" : "#94a3b8" }}>
                灵感广场
                {demoTabActive && <span className="absolute bottom-0 left-0 right-0 mx-auto rounded-full" style={{ height: "3px", width: "28px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />}
              </button>
              <button onClick={() => setActiveTab("projects")}
                className="relative pb-2 text-[20px] font-bold transition-all"
                style={{ color: !demoTabActive ? "#0f172a" : "#94a3b8" }}>
                我的项目
                {projects.length > 0 && <span className="ml-1.5 text-sm text-gray-400">{projects.length}</span>}
                {!demoTabActive && <span className="absolute bottom-0 left-0 right-0 mx-auto rounded-full" style={{ height: "3px", width: "28px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />}
              </button>
            </div>
            <button onClick={() => router.push("/projects")}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
              查看全部 <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>

          {/* Inspiration Tab */}
          {demoTabActive && (
            <div className="grid gap-6 grid-cols-3 pb-16">
              {DEMO_PROJECTS.map((demo) => (
                <div key={demo.title} className="bg-white overflow-hidden transition-all hover:-translate-y-1 group"
                  style={{ borderRadius: "22px", boxShadow: "0 12px 32px rgba(15,23,42,0.10)", border: "1px solid rgba(15,23,42,0.06)" }}>
                  <div className="h-[190px] relative overflow-hidden" style={{ background: demo.fallbackGradient }}>
                    <img src={demo.imagePath} alt={demo.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }} />
                    <div className="absolute rounded-full opacity-30" style={{ width: "120px", height: "120px", top: "20%", right: "15%", background: "rgba(255,255,255,0.15)", filter: "blur(20px)" }} />
                    <div className="absolute rounded-full opacity-20" style={{ width: "80px", height: "80px", bottom: "10%", left: "10%", background: "rgba(255,255,255,0.1)", filter: "blur(16px)" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-3.5 left-4">
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                        {demo.tags}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#0f172a] text-[15px] mb-1.5">{demo.title}</h3>
                    <p className="text-sm text-[#64748b] leading-relaxed line-clamp-2">{demo.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: ["linear-gradient(135deg, #f9a8d4, #c084fc)", "linear-gradient(135deg, #93c5fd, #6366f1)", "linear-gradient(135deg, #a7f3d0, #34d399)"][i] }} />
                          ))}
                        </div>
                        <Star size={14} className="text-amber-400 fill-amber-400 ml-1" />
                        <span className="text-sm font-semibold text-[#0f172a]">{demo.rating}</span>
                      </div>
                      <button onClick={() => handleUseInspiration(demo.title)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all hover:opacity-90"
                        style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)", color: "white" }}>
                        使用这个灵感 <Play size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My Projects Tab */}
          {!demoTabActive && (
            <>
              {projects.length === 0 ? (
                <div className="text-center py-24 pb-20">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(15,23,42,0.04)" }}>
                    <Film size={24} color="#94a3b8" />
                  </div>
                  <p className="text-sm text-[#64748b] mb-1">暂无项目，先生成一个策划案</p>
                  <p className="text-xs text-[#94a3b8]">在上方输入灵感，AI 将自动创建第一个项目</p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-3 pb-16">
                  {projects.map((p) => (
                    <div key={p.id} className="bg-white overflow-hidden transition-all hover:-translate-y-1 group"
                      style={{ borderRadius: "22px", boxShadow: "0 12px 32px rgba(15,23,42,0.10)", border: "1px solid rgba(15,23,42,0.06)" }}>
                      <div className="h-[190px] relative overflow-hidden" style={{ background: getCoverGradient(p.title) }}>
                        <div className="absolute rounded-full opacity-30" style={{ width: "100px", height: "100px", top: "20%", right: "20%", background: "rgba(255,255,255,0.12)", filter: "blur(20px)" }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <div className="absolute top-3.5 right-4">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                            {p.status || "策划中"}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-[#0f172a] text-[15px] mb-1.5 truncate">{p.title}</h3>
                        {p.description && <p className="text-xs text-[#64748b] line-clamp-2 mb-3 leading-relaxed">{p.description}</p>}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5 flex-wrap">
                            {p.type && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>{p.type}</span>}
                            {p.platform && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(15,23,42,0.04)", color: "#64748b" }}>{p.platform}</span>}
                          </div>
                          <span className="text-[10px] text-[#94a3b8]">{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => router.push(`/projects/${p.id}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all hover:opacity-90"
                            style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1)", color: "white" }}>
                            进入项目 <ExternalLink size={12} />
                          </button>
                          <button onClick={() => handleDeleteProject(p.id)}
                            className={`py-2.5 px-3 text-xs font-medium rounded-xl transition-all ${deletingId === p.id ? "bg-red-500 text-white" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}>
                            {deletingId === p.id ? "确认删除？" : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Create Project Modal */}
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateProject} />}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white text-xs px-5 py-2.5 rounded-xl shadow-2xl border border-white/10 backdrop-blur animate-pulse whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
