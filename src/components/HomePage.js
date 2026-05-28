"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    icon: "💡",
    title: "灵感策划",
    desc: "输入故事灵感，AI 自动生成策划案、角色、场景和分镜。",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: "🎯",
    title: "主体一致性",
    desc: "沉淀角色主体和场景主体，减少 AI 视频中的变脸、换装和场景漂移。",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: "⚙️",
    title: "分镜执行",
    desc: "每个镜头都有图片提示词、视频提示词、状态和制作备注。",
    color: "from-emerald-400 to-teal-500",
  },
  {
    icon: "📦",
    title: "交付导出",
    desc: "一键导出制作包，交给出图、视频生成和剪辑人员使用。",
    color: "from-purple-400 to-pink-500",
  },
];

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

  return (
    <div className="h-full overflow-auto">
      {/* ===== Hero Section ===== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">
            有什么新的故事灵感？
          </h1>
          <p className="text-gray-400 text-center text-sm md:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
            输入故事灵感、画风和分镜要求，AI 将自动生成策划案、角色、场景和分镜。
          </p>

          {/* Input area */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 md:p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full bg-white/90 border-0 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={PLACEHOLDER}
            />

            {/* Config grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">内容类型</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {CONTENT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">创作模式</label>
                <select value={mode} onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {MODES.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">画面比例</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {ASPECT_RATIOS.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">分镜数量</label>
                <input type="number" value={storyboardCount} onChange={(e) => setStoryboardCount(Number(e.target.value))}
                  min={6} max={30}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">剧集模式</label>
                <select value={episodeCount} onChange={(e) => setEpisodeCount(Number(e.target.value))}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  <option value={1}>单集</option>
                  <option value={3}>多集 (3集)</option>
                  <option value={5}>多集 (5集)</option>
                  <option value={10}>多集 (10集)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">画风</label>
                <select value={artStyle} onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400">
                  {ART_STYLES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>

            {/* Submit + Boss demo */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={handleGenerate} disabled={loading}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/30">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI 生成策划案中...
                    </span>
                  ) : "AI 生成策划案"}
                </button>
                <button onClick={() => setShowBossDemo(true)}
                  className="text-gray-400 text-xs hover:text-white transition-colors underline underline-offset-2">
                  老板演示说明
                </button>
              </div>
              {error && <span className="text-red-400 text-xs">{error}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Production Flow Cards ===== */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
          AI视频生产流程，从灵感到可执行分镜
        </h2>
        <p className="text-xs text-gray-400 text-center mb-6">
          标准化的 AI 视频内部生产工作流
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FLOW_CARDS.map((card) => (
            <div key={card.title}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-lg mb-3 shadow-sm`}>
                {card.icon}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Project List ===== */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">我的项目</h2>
          <span className="text-xs text-gray-400">{projects.length} 个项目</span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-sm mb-2">暂无项目</div>
            <p className="text-xs text-gray-400">在上方输入灵感，AI 将自动创建第一个项目</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate flex-1">{p.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0 ml-2">
                    {p.status || "策划中"}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  {p.type && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.type}</span>}
                  {p.platform && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.platform}</span>}
                </div>
                {p.description && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.description}</p>}
                <p className="text-xs text-gray-300">{new Date(p.created_at).toLocaleDateString("zh-CN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Boss Demo Modal ===== */}
      {showBossDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBossDemo(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <button onClick={() => setShowBossDemo(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">这个系统解决什么问题？</h2>
            <div className="space-y-5">
              {[
                { num: 1, title: "统一管理", desc: "把剧本、角色、场景、分镜、提示词统一管理在一个工作台里，不再散落在 Excel、飞书文档和微信聊天记录里。" },
                { num: 2, title: "保持一致性", desc: "通过角色主体库和场景主体库，沉淀一致性提示词和禁止变化点，减少 AI 视频中常见的变脸、换装和场景漂移问题，降低返工率。" },
                { num: 3, title: "任务可执行", desc: "每个分镜都是一个独立任务卡片：有画面描述、运镜、台词、图片提示词、视频提示词和状态。可直接交给执行人员按清单推进。" },
                { num: 4, title: "新人培训", desc: "标准化的 策划案 → 角色 → 场景 → 分镜 → 导出 流程，新人按步骤操作即可完成 AI 视频制作，降低培训成本。" },
                { num: 5, title: "交付标准化", desc: "一键导出完整制作包（Markdown），包含策划案、角色设定、场景设定、分镜表、提示词汇总、制作注意事项，直接交给出图、视频生成和剪辑人员。" },
              ].map((item) => (
                <div key={item.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                    {item.num}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowBossDemo(false)}
              className="mt-8 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
