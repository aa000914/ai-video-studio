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
              {/* Content type */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">内容类型</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Mode */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">创作模式</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Aspect ratio */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">画面比例</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {ASPECT_RATIOS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Shot count */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">分镜数量</label>
                <input
                  type="number"
                  value={storyboardCount}
                  onChange={(e) => setStoryboardCount(Number(e.target.value))}
                  min={6}
                  max={30}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* Episode */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">剧集模式</label>
                <select
                  value={episodeCount}
                  onChange={(e) => setEpisodeCount(Number(e.target.value))}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value={1}>单集</option>
                  <option value={3}>多集 (3集)</option>
                  <option value={5}>多集 (5集)</option>
                  <option value={10}>多集 (10集)</option>
                </select>
              </div>

              {/* Art style */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">画风</label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full bg-white/80 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {ART_STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit button */}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/30"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI 生成策划案中...
                  </span>
                ) : (
                  "AI 生成策划案"
                )}
              </button>
              {error && (
                <span className="text-red-400 text-xs">{error}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Project List Section ===== */}
      <div className="max-w-5xl mx-auto px-6 py-10">
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
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate flex-1">{p.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0 ml-2">
                    {p.status || "策划中"}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  {p.type && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.type}</span>
                  )}
                  {p.platform && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.platform}</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.description}</p>
                )}
                <p className="text-xs text-gray-300">
                  {new Date(p.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
