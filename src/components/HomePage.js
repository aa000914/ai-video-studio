"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Shapes,
  Film,
  Package,
  Sparkles,
  Plus,
  Play,
  ChevronDown,
  FileText,
  MessageSquare,
  Monitor,
  Grid3X3,
  Tv,
  Palette,
  Star,
  Trash2,
  ExternalLink,
} from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";

const CONTENT_TYPES = ["短剧漫剧", "音乐MV", "知识分享", "历史文化"];
const MODES = ["对话剧情", "旁白解说"];
const ASPECT_RATIOS = ["9:16", "16:9", "3:4", "4:3"];
const ART_STYLES = ["写实", "国漫", "二次元", "油画", "赛博朋克", "电影质感"];

const PLACEHOLDER = `例如：
#画风要求#电影级写实风，冷色调。
#角色要求#主角李天行，穿越到秦朝，落魄但机敏。
#视频要求#12个分镜，约1分钟，包含台词和旁白。
#场景要求#咸阳城门、秦王殿、秦宫长廊。
#分镜内容#李天行看到扶苏寻师皇榜，进入秦王宫，与淳于越发生冲突，最后展现现代知识震惊众人。`;

const DEMO_PROMPTS = {
  "秦朝穿越短剧": `#画风要求#电影级写实风，暖色调，秦朝历史背景。
#角色要求#主角李天行，现代青年穿越秦朝，机敏果敢。
#视频要求#12个分镜，约1分钟，包含台词和旁白。
#场景要求#咸阳城门、秦王殿、秦宫长廊、市集街道。
#分镜内容#李天行穿越到秦朝，目睹扶苏寻师皇榜，决定入宫一展才华，与朝中大臣展开智慧较量。`,
  "末日穹顶城市": `#画风要求#赛博朋克风，冷色调，末日废墟感。
#角色要求#主角林夜，穹顶城市工程师，发现城市能源系统暗藏秘密。
#视频要求#12个分镜，约1分钟，包含台词和旁白。
#场景要求#穹顶控制室、能源核心区、下城暗巷、穹顶观景台。
#分镜内容#林夜在检修能源系统时发现异常数据，追踪真相时卷入权力斗争，最终面临拯救城市还是揭露真相的抉择。`,
  "文博青花瓷复原": `#画风要求#电影级写实风，典雅暖色调，元代历史背景。
#角色要求#文物修复师苏婉，专注青花瓷修复与研究。
#视频要求#12个分镜，约1分钟，包含旁白。
#场景要求#博物馆修复室、元代窑址、海上丝绸之路码头、现代展厅。
#分镜内容#苏婉在修复一件元代青花瓷时，通过AI技术还原其制作过程，追溯从景德镇到波斯的文化交流之路。`,
};

const DEMO_PROJECTS = [
  {
    title: "秦朝穿越短剧",
    tags: "短剧 · 历史",
    description: "现代青年穿越秦朝，卷入扶苏寻师与朝堂权谋。",
    rating: "9.4",
    coverGradient: "linear-gradient(135deg, #3b1d0f, #b45309, #111827)",
  },
  {
    title: "末日穹顶城市",
    tags: "短剧 · 科幻",
    description: "人类最后的庇护所，穹顶之下的生存博弈。",
    rating: "9.2",
    coverGradient: "linear-gradient(135deg, #0f172a, #1e3a8a, #94a3b8)",
  },
  {
    title: "文博青花瓷复原",
    tags: "纪录片 · 文博",
    description: "AI 助力文物数字复原，重现千年工艺之美。",
    rating: "9.6",
    coverGradient: "linear-gradient(135deg, #eff6ff, #1d4ed8, #0f172a)",
  },
];

const FLOW_CARDS = [
  {
    icon: Lightbulb,
    title: "灵感策划",
    desc: "输入故事灵感，AI 自动生成策划案、角色、场景和分镜。",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Shapes,
    title: "主体一致性",
    desc: "沉淀角色主体和场景主体，减少 AI 视频中的变脸、换装和场景漂移。",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: Film,
    title: "分镜执行",
    desc: "每个镜头都有图片提示词、视频提示词、状态和制作备注。",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: Package,
    title: "交付导出",
    desc: "一键导出制作包，交给出图、视频生成和剪辑人员使用。",
    color: "from-purple-400 to-pink-500",
  },
];

const CONFIG_ITEMS = [
  {
    key: "contentType",
    label: "内容类型",
    icon: FileText,
    options: CONTENT_TYPES,
    displayMap: (v) => v,
  },
  {
    key: "mode",
    label: "创作模式",
    icon: MessageSquare,
    options: MODES,
    displayMap: (v) => v,
  },
  {
    key: "aspectRatio",
    label: "画面比例",
    icon: Monitor,
    options: ASPECT_RATIOS,
    displayMap: (v) => v,
  },
  {
    key: "storyboardCount",
    label: "分镜数量",
    icon: Grid3X3,
    options: [6, 12, 18, 24, 30],
    displayMap: (v) => `${v}`,
  },
  {
    key: "episodeCount",
    label: "剧集模式",
    icon: Tv,
    options: [1, 3, 5, 10],
    displayMap: (v) => (v === 1 ? "单集" : `多集 (${v}集)`),
  },
  {
    key: "artStyle",
    label: "画风",
    icon: Palette,
    options: ART_STYLES,
    displayMap: (v) => v,
  },
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

/* ---- Config Dropdown ---- */
function ConfigDropdown({
  icon: Icon,
  label,
  value,
  options,
  displayMap,
  onChange,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full text-left rounded-2xl px-[18px] py-3 min-w-[150px] h-[58px] transition-all"
        style={{
          background: "rgba(15,23,42,0.68)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <Icon size={16} className="text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 leading-tight">
            {label}
          </div>
          <div className="text-sm text-white truncate">
            {displayMap ? displayMap(value) : value}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full left-0 mt-1.5 w-full z-20 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(20px)",
            }}
          >
            {options.map((opt) => {
              const optValue =
                typeof opt === "number" ? opt : opt;
              const currentValue =
                typeof value === "number" ? value : value;
              const isSelected = optValue === currentValue;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(
                      typeof opt === "number" ? opt : opt
                    );
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                    isSelected
                      ? "text-white bg-white/[0.08]"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
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

/* ---- Main Component ---- */
export default function HomePageClient({ initialProjects, initialError }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("短剧漫剧");
  const [mode, setMode] = useState("对话剧情");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [storyboardCount, setStoryboardCount] = useState(12);
  const [episodeCount, setEpisodeCount] = useState(1);
  const [artStyle, setArtStyle] = useState("电影质感");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [projects, setProjects] = useState(initialProjects);
  const [showBossDemo, setShowBossDemo] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");
  const [showDemoPopover, setShowDemoPopover] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function getValue(key) {
    const map = {
      contentType,
      mode,
      aspectRatio,
      storyboardCount,
      episodeCount,
      artStyle,
    };
    return map[key];
  }

  function setValue(key, val) {
    const setters = {
      contentType: setContentType,
      mode: setMode,
      aspectRatio: setAspectRatio,
      storyboardCount: setStoryboardCount,
      episodeCount: setEpisodeCount,
      artStyle: setArtStyle,
    };
    setters[key](val);
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("请输入故事灵感");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          content_type: contentType,
          mode,
          aspect_ratio: aspectRatio,
          storyboard_count: storyboardCount,
          art_style: artStyle,
          episode_count: episodeCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "生成失败");

      if (json.data?.parseError) {
        setError("AI输出格式异常，请重试");
        return;
      }

      router.push(`/projects/${json.data.project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleUseInspiration(demoTitle) {
    const demoPrompt = DEMO_PROMPTS[demoTitle];
    if (demoPrompt) {
      setPrompt(demoPrompt);
      setActiveTab("projects");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleCreateDemo(demo) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: demo.title,
          type: demo.tags.includes("短剧") ? "AI短剧" : "文博视频",
          platform: "抖音",
          description: demo.description,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建失败");
      router.push(`/projects/${json.data.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCreateProject(newProject) {
    setProjects((prev) => [newProject, ...prev]);
    setShowCreateModal(false);
    router.push(`/projects/${newProject.id}`);
  }

  async function handleDeleteProject(projectId) {
    if (deletingId !== projectId) {
      setDeletingId(projectId);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeletingId(null);
    } catch (err) {
      setError(err.message);
      setDeletingId(null);
    }
  }

  const demoTabActive = activeTab === "inspiration";

  return (
    <div className="h-full overflow-auto">
      {/* ============================================ */}
      {/* HERO SECTION — dark gradient 560px            */}
      {/* ============================================ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #070b1f 0%, #11183a 50%, #2a1265 100%)",
          minHeight: "560px",
        }}
      >
        {/* Decorative blur orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[-60px] left-[-80px] w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
            style={{ background: "rgba(99,102,241,0.3)" }}
          />
          <div
            className="absolute bottom-[-80px] right-[-60px] w-[450px] h-[450px] rounded-full blur-3xl opacity-25"
            style={{ background: "rgba(139,92,246,0.3)" }}
          />
        </div>

        <div
          className="relative mx-auto px-6 pt-16 pb-14"
          style={{ maxWidth: "1100px" }}
        >
          {/* Title */}
          <h1
            className="text-center text-white leading-tight"
            style={{ fontSize: "52px", fontWeight: 800 }}
          >
            有什么新的故事灵感？
          </h1>
          <p
            className="text-center mt-4"
            style={{ fontSize: "16px", color: "#cbd5e1" }}
          >
            输入你的故事灵感、风格和分镜要求，AI
            将为你生成策划案、角色、场景和分镜
          </p>

          {/* AI Console */}
          <div
            className="mx-auto mt-10 p-6"
            style={{
              maxWidth: "980px",
              background: "rgba(15,23,42,0.58)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            }}
          >
            {/* Textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDER}
              className="w-full bg-transparent border-none text-white text-[15px] leading-relaxed placeholder-[#94a3b8] focus:outline-none resize-none"
              style={{ height: "140px" }}
            />

            {/* Config row */}
            <div className="flex flex-wrap gap-3 mt-5">
              {CONFIG_ITEMS.map((item) => (
                <ConfigDropdown
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  value={getValue(item.key)}
                  options={item.options}
                  displayMap={item.displayMap}
                  onChange={(val) => setValue(item.key, val)}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              {/* Primary: AI Generate */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  width: "320px",
                  height: "56px",
                  background:
                    "linear-gradient(90deg, #8b5cf6, #2563eb)",
                  borderRadius: "18px",
                  boxShadow: "0 18px 40px rgba(79,70,229,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(0)";
                }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI 生成策划案中...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    AI 生成策划案
                  </>
                )}
              </button>

              {/* Secondary: Demo popover */}
              <div className="relative">
                <button
                  onClick={() =>
                    setShowDemoPopover(!showDemoPopover)
                  }
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-white/70 hover:text-white rounded-2xl transition-all"
                  style={{
                    background: "rgba(15,23,42,0.50)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Play size={14} />
                  创建演示项目
                  <ChevronDown size={14} />
                </button>
                {showDemoPopover && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() =>
                        setShowDemoPopover(false)
                      }
                    />
                    <div
                      className="absolute top-full left-0 mt-2 w-60 z-20 rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        background: "rgba(15,23,42,0.98)",
                        border:
                          "1px solid rgba(255,255,255,0.10)",
                        backdropFilter: "blur(20px)",
                      }}
                    >
                      {DEMO_PROJECTS.map((demo) => (
                        <button
                          key={demo.title}
                          onClick={() => {
                            setShowDemoPopover(false);
                            handleCreateDemo(demo);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-all flex items-center gap-3"
                        >
                          <div
                            className="w-9 h-9 rounded-xl shrink-0"
                            style={{
                              background:
                                demo.coverGradient,
                            }}
                          />
                          <div>
                            <div className="text-sm text-white font-medium">
                              {demo.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {demo.tags}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Secondary: New Project */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-white/70 hover:text-white rounded-2xl transition-all"
                style={{
                  background: "rgba(15,23,42,0.50)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Plus size={14} />
                新建项目
              </button>

              {/* Error + Boss Demo */}
              <div className="flex items-center gap-3 ml-auto">
                {error && (
                  <span className="text-red-400 text-xs">
                    {error}
                  </span>
                )}
                <button
                  onClick={() => setShowBossDemo(true)}
                  className="text-gray-500 text-xs hover:text-white transition-colors underline underline-offset-2"
                >
                  老板演示说明
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* LIGHT CONTENT AREA — #f6f7fb                    */}
      {/* ============================================ */}
      <div style={{ background: "#f6f7fb" }}>
        <div
          className="mx-auto px-6"
          style={{ maxWidth: "1200px" }}
        >
          {/* ===== Capability Cards (floating up) ===== */}
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            style={{ marginTop: "-48px" }}
          >
            {FLOW_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white p-7 transition-all"
                style={{
                  borderRadius: "22px",
                  boxShadow:
                    "0 20px 50px rgba(15,23,42,0.08)",
                  border: "1px solid rgba(15,23,42,0.04)",
                }}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-md`}
                  style={{ width: "48px", height: "48px" }}
                >
                  <card.icon
                    size={20}
                    className="text-white"
                  />
                </div>
                <h3
                  className="mb-2"
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    lineHeight: 1.6,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ===== Tabs ===== */}
          <div className="flex items-center gap-8 pt-12 pb-6">
            <button
              onClick={() => setActiveTab("inspiration")}
              className="relative pb-2 text-lg font-semibold transition-all"
              style={{
                color: demoTabActive ? "#0f172a" : "#94a3b8",
              }}
            >
              灵感广场
              {demoTabActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 mx-auto rounded-full"
                  style={{
                    height: "3px",
                    background:
                      "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className="relative pb-2 text-lg font-semibold transition-all"
              style={{
                color: !demoTabActive ? "#0f172a" : "#94a3b8",
              }}
            >
              我的项目
              {projects.length > 0 && (
                <span className="ml-1.5 text-sm text-gray-400">
                  {projects.length}
                </span>
              )}
              {!demoTabActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 mx-auto rounded-full"
                  style={{
                    height: "3px",
                    background:
                      "linear-gradient(90deg, #6366f1, #8b5cf6)",
                  }}
                />
              )}
            </button>
          </div>

          {/* ===== Inspiration Tab ===== */}
          {demoTabActive && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pb-16">
              {DEMO_PROJECTS.map((demo) => (
                <div
                  key={demo.title}
                  className="bg-white overflow-hidden transition-all hover:shadow-lg"
                  style={{
                    borderRadius: "24px",
                    boxShadow:
                      "0 8px 30px rgba(15,23,42,0.06)",
                    height: "300px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Cover */}
                  <div
                    className="relative shrink-0"
                    style={{
                      height: "170px",
                      background: demo.coverGradient,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute top-3 left-4">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background:
                            "rgba(255,255,255,0.18)",
                          color: "white",
                          border:
                            "1px solid rgba(255,255,255,0.15)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {demo.tags}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-[#0f172a] text-base mb-1">
                        {demo.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed line-clamp-2"
                        style={{ color: "#64748b" }}
                      >
                        {demo.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <Star
                          size={14}
                          className="text-amber-400 fill-amber-400"
                        />
                        <span className="text-sm font-semibold text-[#0f172a]">
                          {demo.rating}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleUseInspiration(
                            demo.title
                          )
                        }
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl transition-all"
                        style={{
                          background:
                            "linear-gradient(90deg, #8b5cf6, #2563eb)",
                          color: "white",
                        }}
                      >
                        使用这个灵感
                        <Play size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== My Projects Tab ===== */}
          {!demoTabActive && (
            <>
              {projects.length === 0 ? (
                <div className="text-center py-24 pb-20">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "rgba(15,23,42,0.04)",
                    }}
                  >
                    <Film size={24} color="#94a3b8" />
                  </div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "#64748b" }}
                  >
                    暂无项目
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "#94a3b8" }}
                  >
                    在上方输入灵感，AI 将自动创建第一个项目
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pb-16">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white overflow-hidden transition-all hover:shadow-lg group"
                      style={{
                        borderRadius: "24px",
                        boxShadow:
                          "0 8px 30px rgba(15,23,42,0.06)",
                      }}
                    >
                      {/* Cover */}
                      <div
                        className="h-32 relative overflow-hidden"
                        style={{
                          background:
                            getCoverGradient(p.title),
                        }}
                      >
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full"
                            style={{
                              background:
                                "rgba(255,255,255,0.18)",
                              color: "white",
                              border:
                                "1px solid rgba(255,255,255,0.15)",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            {p.status || "策划中"}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-[#0f172a] text-sm mb-1.5 truncate">
                          {p.title}
                        </h3>
                        {p.description && (
                          <p
                            className="text-xs line-clamp-2 mb-3 leading-relaxed"
                            style={{ color: "#64748b" }}
                          >
                            {p.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1.5 flex-wrap">
                            {p.type && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  background:
                                    "rgba(99,102,241,0.08)",
                                  color: "#6366f1",
                                }}
                              >
                                {p.type}
                              </span>
                            )}
                            {p.platform && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{
                                  background:
                                    "rgba(15,23,42,0.04)",
                                  color: "#64748b",
                                }}
                              >
                                {p.platform}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px]"
                            style={{ color: "#94a3b8" }}
                          >
                            {new Date(
                              p.created_at
                            ).toLocaleDateString("zh-CN")}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() =>
                              router.push(
                                `/projects/${p.id}`
                              )
                            }
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-all"
                            style={{
                              background:
                                "linear-gradient(90deg, #8b5cf6, #2563eb)",
                              color: "white",
                            }}
                          >
                            进入项目
                            <ExternalLink size={12} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteProject(p.id)
                            }
                            className={`py-2 px-3 text-xs font-medium rounded-xl transition-all ${
                              deletingId === p.id
                                ? "bg-red-500 text-white"
                                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                          >
                            {deletingId === p.id ? (
                              "确认删除？"
                            ) : (
                              <Trash2 size={14} />
                            )}
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
      </div>

      {/* ===== Boss Demo Modal ===== */}
      {showBossDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBossDemo(false)}
          />
          <div
            className="relative p-8 w-full max-w-lg mx-4 max-h-[80vh] overflow-auto shadow-2xl"
            style={{
              background: "#111128",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
            }}
          >
            <button
              onClick={() => setShowBossDemo(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl leading-none transition-colors"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-white mb-6">
              这个系统解决什么问题？
            </h2>
            <div className="space-y-5">
              {[
                {
                  num: 1,
                  title: "统一管理",
                  desc: "把剧本、角色、场景、分镜、提示词统一管理在一个工作台里，不再散落在 Excel、飞书文档和微信聊天记录里。",
                },
                {
                  num: 2,
                  title: "保持一致性",
                  desc: "通过角色主体库和场景主体库，沉淀一致性提示词和禁止变化点，减少 AI 视频中常见的变脸、换装和场景漂移问题，降低返工率。",
                },
                {
                  num: 3,
                  title: "任务可执行",
                  desc: "每个分镜都是一个独立任务卡片：有画面描述、运镜、台词、图片提示词、视频提示词和状态。可直接交给执行人员按清单推进。",
                },
                {
                  num: 4,
                  title: "新人培训",
                  desc: "标准化的 策划案 → 角色 → 场景 → 分镜 → 导出 流程，新人按步骤操作即可完成 AI 视频制作，降低培训成本。",
                },
                {
                  num: 5,
                  title: "交付标准化",
                  desc: "一键导出完整制作包（Markdown），包含策划案、角色设定、场景设定、分镜表、提示词汇总、制作注意事项，直接交给出图、视频生成和剪辑人员。",
                },
              ].map((item) => (
                <div key={item.num} className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                    style={{
                      background:
                        "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    }}
                  >
                    {item.num}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowBossDemo(false)}
              className="mt-8 w-full text-white py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background:
                  "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {/* ===== Create Project Modal ===== */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
