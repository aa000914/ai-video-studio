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

const DEMO_PROJECTS = [
  {
    title: "秦朝穿越短剧",
    type: "AI短剧",
    platform: "抖音",
    description:
      "现代青年李天行意外穿越到秦朝，凭借现代知识和机敏头脑，在秦王宫步步为营，用智慧震惊众人。",
    coverGradient: "from-amber-500 via-orange-600 to-red-600",
  },
  {
    title: "末日穹顶城市",
    type: "AI短剧",
    platform: "B站",
    description:
      "在封闭的穹顶城市中，幸存者们面临资源匮乏与人性考验，一场关乎存亡的博弈正在展开。",
    coverGradient: "from-teal-500 via-cyan-600 to-blue-700",
  },
  {
    title: "文博青花瓷复原",
    type: "文博视频",
    platform: "小红书",
    description:
      "用 AI 技术还原元代青花瓷的制作工艺，讲述海上丝绸之路背后的文化与历史故事。",
    coverGradient: "from-blue-500 via-indigo-500 to-purple-600",
  },
];

const COVER_GRADIENTS = [
  "from-indigo-600 to-purple-700",
  "from-blue-600 to-cyan-500",
  "from-amber-500 to-rose-600",
  "from-emerald-600 to-teal-500",
  "from-pink-500 to-purple-600",
  "from-cyan-500 to-blue-600",
];

function getCoverGradient(title) {
  const sum = [...(title || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

const pillSelectClass =
  "appearance-none bg-transparent text-white/80 text-xs cursor-pointer focus:outline-none pr-5 pl-2 py-0.5 text-center";

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

  async function handleCreateDemo(demo) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo),
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

  const demoTabActive = activeTab === "inspiration";

  return (
    <div className="h-full overflow-auto bg-slate-950">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950 via-indigo-950/40 to-slate-950">
        {/* Decorative blur blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-32 w-[450px] h-[450px] bg-indigo-500/15 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 left-1/3 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-14 pb-16 md:pt-18 md:pb-20">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-3 tracking-tight leading-tight">
            有什么新的故事灵感？
          </h1>
          <p className="text-white/40 text-center text-sm md:text-base mb-10 max-w-2xl mx-auto leading-relaxed">
            输入你的故事灵感、风格和分镜要求，AI
            将为你生成策划案、角色、场景和分镜
          </p>

          {/* Glassmorphism AI Console */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-5 md:p-6 shadow-2xl shadow-black/30">
            {/* Textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 resize-none transition-all"
              placeholder={PLACEHOLDER}
            />

            {/* Config Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  内容类型
                </span>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={pillSelectClass}
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-slate-800">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  创作模式
                </span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className={pillSelectClass}
                >
                  {MODES.map((m) => (
                    <option key={m} value={m} className="bg-slate-800">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  画面比例
                </span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={pillSelectClass}
                >
                  {ASPECT_RATIOS.map((r) => (
                    <option key={r} value={r} className="bg-slate-800">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  分镜数量
                </span>
                <input
                  type="number"
                  value={storyboardCount}
                  onChange={(e) =>
                    setStoryboardCount(Number(e.target.value))
                  }
                  min={6}
                  max={30}
                  className="appearance-none bg-transparent text-white/80 text-xs w-10 text-center focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  剧集模式
                </span>
                <select
                  value={episodeCount}
                  onChange={(e) =>
                    setEpisodeCount(Number(e.target.value))
                  }
                  className={pillSelectClass}
                >
                  <option value={1} className="bg-slate-800">
                    单集
                  </option>
                  <option value={3} className="bg-slate-800">
                    多集 (3集)
                  </option>
                  <option value={5} className="bg-slate-800">
                    多集 (5集)
                  </option>
                  <option value={10} className="bg-slate-800">
                    多集 (10集)
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
                <span className="text-[10px] text-gray-500 shrink-0">
                  画风
                </span>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className={pillSelectClass}
                >
                  {ART_STYLES.map((s) => (
                    <option key={s} value={s} className="bg-slate-800">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI 生成策划案中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      AI 生成策划案
                    </>
                  )}
                </button>

                {/* Demo project popover */}
                <div className="relative">
                  <button
                    onClick={() => setShowDemoPopover(!showDemoPopover)}
                    className="bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                  >
                    <Play size={14} />
                    创建演示项目
                    <ChevronDown size={14} />
                  </button>
                  {showDemoPopover && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDemoPopover(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-60 bg-[#111128] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 z-20 overflow-hidden">
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
                              className={`w-8 h-8 rounded-lg bg-gradient-to-br ${demo.coverGradient} shrink-0`}
                            />
                            <div>
                              <div className="text-sm text-white font-medium">
                                {demo.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {demo.type}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  新建项目
                </button>
              </div>

              <div className="flex items-center gap-3">
                {error && (
                  <span className="text-red-400 text-xs">{error}</span>
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

      {/* ===== Capability Cards ===== */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 -mt-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group shadow-lg shadow-black/10"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg`}
              >
                <card.icon size={18} className="text-white" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5 group-hover:text-white/90">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Projects Section ===== */}
      <section className="max-w-5xl mx-auto px-6 py-6 pb-20">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
            <button
              onClick={() => setActiveTab("inspiration")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                demoTabActive
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-gray-500 hover:text-white/70"
              }`}
            >
              灵感广场
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !demoTabActive
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-gray-500 hover:text-white/70"
              }`}
            >
              我的项目
              {projects.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-500">
                  {projects.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Inspiration tab: Demo project cards */}
        {demoTabActive && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_PROJECTS.map((demo) => (
              <div
                key={demo.title}
                onClick={() => handleCreateDemo(demo)}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group shadow-lg shadow-black/10"
              >
                <div
                  className={`h-36 bg-gradient-to-br ${demo.coverGradient} relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <span className="text-xs bg-white/20 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full border border-white/10">
                      {demo.type}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1.5 group-hover:text-white/90">
                    {demo.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                    {demo.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {demo.platform}
                    </span>
                    <span className="text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                      创建此项目 <Play size={12} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects tab: User project cards */}
        {!demoTabActive && (
          <>
            {projects.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <Film size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm mb-1">暂无项目</p>
                <p className="text-xs text-gray-600">
                  在上方输入灵感，AI 将自动创建第一个项目
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group shadow-lg shadow-black/10"
                  >
                    <div
                      className={`h-32 bg-gradient-to-br ${getCoverGradient(p.title)} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="absolute top-3 right-3">
                        <span className="text-xs bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-full border border-white/10">
                          {p.status || "策划中"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white text-sm mb-1.5 truncate group-hover:text-white/90">
                        {p.title}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {p.type && (
                            <span className="text-[10px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.06]">
                              {p.type}
                            </span>
                          )}
                          {p.platform && (
                            <span className="text-[10px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded-full border border-white/[0.06]">
                              {p.platform}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600">
                          {new Date(p.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ===== Boss Demo Modal ===== */}
      {showBossDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBossDemo(false)}
          />
          <div className="relative bg-[#111128] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-8 w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
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
              className="mt-8 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
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
