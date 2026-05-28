"use client";

import { useState, useEffect } from "react";

export default function ExportPanel({ project, projectId }) {
  const [plan, setPlan] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [copied, setCopied] = useState("");

  useEffect(() => { loadData(); }, [projectId]);

  async function loadData() {
    try {
      const [planRes, charRes, sceneRes, shotRes] = await Promise.all([
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
      ]);
      const [p, c, s, sh] = await Promise.all([
        planRes.json(), charRes.json(), sceneRes.json(), shotRes.json(),
      ]);
      setPlan(p.data || null);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      setShots(sh.data || []);
    } catch { /* ignore */ }
  }

  // Stats helpers
  const approved = shots.filter((s) => s.status === "已通过").length;
  const pending = shots.filter((s) => !s.status || s.status === "待生成").length;
  const imageDone = shots.filter((s) => s.status === "已生成图").length;
  const videoDone = shots.filter((s) => s.status === "已生成视频").length;
  const redo = shots.filter((s) => s.status === "需重做").length;
  const completionPct = shots.length > 0 ? Math.round((approved / shots.length) * 100) : 0;
  const imageCredits = shots.length * 2;
  const videoCredits = shots.length * 10;
  const totalCredits = imageCredits + videoCredits;

  function generateMarkdown() {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    let md = `# ${project.title}\n\n`;
    md += `> 本制作包由 AI视频生产工作台 自动生成 | V4 生产执行版\n`;
    md += `> 导出时间：${now}\n\n`;
    md += `---\n\n`;

    // ===== 生产总览 =====
    md += `## 生产总览\n\n`;
    md += `| 指标 | 数值 |\n|------|------|\n`;
    md += `| 角色数量 | ${characters.length} |\n`;
    md += `| 场景数量 | ${scenes.length} |\n`;
    md += `| 分镜数量 | ${shots.length} |\n`;
    md += `| 待生成 | ${pending} |\n`;
    md += `| 已生成图 | ${imageDone} |\n`;
    md += `| 已生成视频 | ${videoDone} |\n`;
    md += `| 需重做 | ${redo} |\n`;
    md += `| 已通过 | ${approved} |\n`;
    md += `| 完成度 | ${completionPct}% |\n`;
    md += `| 预计图片积分 | ${imageCredits} |\n`;
    md += `| 预计视频积分 | ${videoCredits} |\n`;
    md += `| **总预计积分** | **${totalCredits}** |\n`;
    md += `\n---\n\n`;

    // ===== 模型配置建议 =====
    md += `## 模型配置建议\n\n`;
    md += `| 配置项 | 推荐值 |\n|------|------|\n`;
    md += `| 推荐生图模型 | 一致性短剧模型 / 文生图模型 |\n`;
    md += `| 推荐视频模型 | Seedance / 可灵 |\n`;
    md += `| 推荐画面比例 | ${plan?.aspect_ratio || "9:16"} |\n`;
    md += `| 推荐分辨率 | 1080P |\n`;
    md += `| 建议单镜时长 | 5s |\n`;
    md += `\n---\n\n`;

    // ===== 一、策划案 =====
    md += `## 一、策划案\n\n`;
    if (plan) {
      md += `| 字段 | 内容 |\n|------|------|\n`;
      md += `| 策划摘要 | ${(plan.summary || "—").replace(/\n/g, " ")} |\n`;
      md += `| 美术风格 | ${plan.art_style || "—"} |\n`;
      md += `| 内容类型 | ${plan.content_type || "—"} |\n`;
      md += `| 画面比例 | ${plan.aspect_ratio || "—"} |\n`;
      md += `| 创作模式 | ${plan.mode || "—"} |\n`;
      md += `| 音乐风格 | ${plan.music_style || "—"} |\n`;
      md += `| 旁白风格 | ${plan.narration_style || "—"} |\n`;
      md += `| 分镜数量 | ${plan.storyboard_count || "—"} |\n`;
      if (plan.script_text) {
        md += `\n### 剧本原文\n\n${plan.script_text}\n`;
      }
    } else {
      md += `> 暂无策划案\n`;
    }
    md += `\n---\n\n`;

    // ===== 二、角色主体 =====
    md += `## 二、角色主体\n\n`;
    if (characters.length === 0) {
      md += `> 暂无角色数据\n\n`;
    } else {
      characters.forEach((c, i) => {
        md += `### 角色 ${i + 1}：${c.name}\n\n`;
        md += `**基础设定**\n\n| 属性 | 内容 |\n|------|------|\n`;
        md += `| 身份 | ${c.role || "—"} |\n`;
        md += `| 年龄 | ${c.age || "—"} |\n`;
        md += `| 性格 | ${c.personality || "—"} |\n`;
        if (c.appearance) md += `| 外貌 | ${c.appearance} |\n`;
        if (c.costume) md += `| 服装 | ${c.costume} |\n`;
        md += `\n**一致性提示词**\n\n\`\`\`\n${c.prompt || "—"}\n\`\`\`\n\n`;
        md += `**禁止变化点**\n\n${c.prohibited_changes || "—"}\n\n`;
        if (c.notes) md += `**备注**：${c.notes}\n\n`;
      });
    }
    md += `---\n\n`;

    // ===== 三、场景主体 =====
    md += `## 三、场景主体\n\n`;
    if (scenes.length === 0) {
      md += `> 暂无场景数据\n\n`;
    } else {
      scenes.forEach((s, i) => {
        md += `### 场景 ${i + 1}：${s.name}\n\n`;
        md += `**空间描述**\n\n| 属性 | 内容 |\n|------|------|\n`;
        md += `| 地点 | ${s.location || "—"} |\n`;
        md += `| 时代 | ${s.time_period || "—"} |\n`;
        if (s.description) md += `| 空间 | ${s.description} |\n`;
        if (s.lighting) md += `| 光线 | ${s.lighting} |\n`;
        if (s.style) md += `| 风格 | ${s.style} |\n`;
        md += `\n**场景提示词**\n\n\`\`\`\n${s.prompt || "—"}\n\`\`\`\n\n`;
        md += `**禁止元素**\n\n${s.prohibited_elements || "—"}\n\n`;
        if (s.prompt_front) md += `**主视图**：\`${s.prompt_front}\`\n\n`;
        if (s.prompt_back) md += `**反打视图**：\`${s.prompt_back}\`\n\n`;
        if (s.prompt_overhead) md += `**俯视图**：\`${s.prompt_overhead}\`\n\n`;
      });
    }
    md += `---\n\n`;

    // ===== 四、分镜剧本 =====
    md += `## 四、分镜剧本\n\n`;
    if (shots.length === 0) {
      md += `> 暂无分镜数据\n\n`;
    } else {
      md += `| # | 时长 | 场景 | 角色 | 画面 | 运镜 | 台词 | 音效 | 状态 |\n`;
      md += `|---|------|------|------|------|------|------|------|------|\n`;
      shots.forEach((s) => {
        const esc = (v) => (v || "—").replace(/\|/g, "｜").replace(/\n/g, " / ");
        md += `| ${s.shot_number || "—"} | ${s.duration || "—"} | ${esc(s.scene_name)} | ${esc(s.characters)} | ${esc(s.visual)} | ${esc(s.camera)} | ${esc(s.dialogue)} | ${esc(s.sound)} | ${s.status || "—"} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // ===== 五、分镜执行清单 =====
    md += `## 五、分镜执行清单\n\n`;
    if (shots.length === 0) {
      md += `> 暂无分镜\n\n`;
    } else {
      md += `> 以下为每个镜头的执行详情，包含状态、提示词和制作备注。\n\n`;
      shots.forEach((s) => {
        md += `### 镜头 ${s.shot_number} — ${s.scene_name || "—"}\n\n`;
        md += `| 属性 | 内容 |\n|------|------|\n`;
        md += `| 状态 | ${s.status || "待生成"} |\n`;
        md += `| 场景 | ${s.scene_name || "—"} |\n`;
        md += `| 角色 | ${s.characters || "—"} |\n`;
        md += `| 时长 | ${s.duration || "—"} |\n`;
        if (s.visual) md += `| 画面 | ${s.visual} |\n`;
        if (s.dialogue) md += `| 台词 | ${s.dialogue} |\n`;
        md += `\n**图片提示词**\n\n\`\`\`\n${s.image_prompt || "—"}\n\`\`\`\n\n`;
        if (s.refined_image_prompt) md += `**润色版图片提示词**\n\n\`\`\`\n${s.refined_image_prompt}\n\`\`\`\n\n`;
        md += `**视频提示词**\n\n\`\`\`\n${s.video_prompt || "—"}\n\`\`\`\n\n`;
        if (s.refined_video_prompt) md += `**润色版视频提示词**\n\n\`\`\`\n${s.refined_video_prompt}\n\`\`\`\n\n`;
        if (s.notes) md += `**制作备注**：${s.notes}\n\n`;
        md += `---\n\n`;
      });
    }
    md += `---\n\n`;

    // ===== 六、图片提示词汇总 =====
    md += `## 六、图片提示词汇总\n\n`;
    md += `> 可直接用于 Midjourney / Stable Diffusion / DALL·E 等工具。\n\n`;
    const imageShots = shots.filter((s) => s.image_prompt);
    if (imageShots.length === 0) {
      md += `> 暂无\n\n`;
    } else {
      imageShots.forEach((s) => {
        md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
        md += `\`\`\`\n${s.image_prompt}\n\`\`\`\n\n`;
        if (s.refined_image_prompt) md += `**润色版：**\n\n\`\`\`\n${s.refined_image_prompt}\n\`\`\`\n\n`;
      });
    }
    md += `---\n\n`;

    // ===== 七、视频提示词汇总 =====
    md += `## 七、视频提示词汇总\n\n`;
    md += `> 可直接用于 Runway / Pika / Sora / Kling 等工具。\n\n`;
    const videoShots = shots.filter((s) => s.video_prompt);
    if (videoShots.length === 0) {
      md += `> 暂无\n\n`;
    } else {
      videoShots.forEach((s) => {
        md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
        md += `\`\`\`\n${s.video_prompt}\n\`\`\`\n\n`;
        if (s.refined_video_prompt) md += `**润色版：**\n\n\`\`\`\n${s.refined_video_prompt}\n\`\`\`\n\n`;
      });
    }
    md += `---\n\n`;

    // ===== 八、制作注意事项 =====
    md += `## 八、制作注意事项\n\n`;
    md += `### 1. 角色一致性\n\n`;
    if (characters.length > 0) {
      md += `- 每个角色的外貌、服装、提示词已在"角色主体"中统一设定，请严格遵循。\n`;
      md += `- 同一角色在不同镜头中的服装和发型必须保持一致。\n`;
    }
    md += `\n### 2. 场景一致性\n\n`;
    if (scenes.length > 0) {
      md += `- 本片共 ${scenes.length} 个场景：${scenes.map((s) => s.name).join("、")}。\n`;
    }
    md += `\n### 3. 分镜时长控制\n\n`;
    md += `- 共 ${shots.length} 个分镜，建议总时长约 ${Math.round(shots.length * 5 / 60)} 分钟。\n`;
    if (plan?.aspect_ratio) md += `\n### 4. 画面比例\n\n- 本片比例为 **${plan.aspect_ratio}**。\n`;
    md += `\n### 5. 配音建议\n\n`;
    md += `- 对白类镜头使用 TTS 配音（ElevenLabs / 剪映）。\n`;
    md += `- 旁白类保持统一语调。\n`;
    md += `- 背景音乐使用无版权素材。\n`;
    md += `\n### 6. 推荐生成顺序\n\n`;
    md += `1. 先生图，确认构图和光影\n2. 再生视频\n3. 后期合成\n`;

    md += `\n---\n\n> 本文件由 AI视频生产工作台 自动生成 | V4 生产执行版\n`;
    return md;
  }

  async function copyAll() {
    try { await navigator.clipboard.writeText(generateMarkdown()); setCopied("已复制"); }
    catch { setCopied("复制失败"); }
    setTimeout(() => setCopied(""), 2000);
  }

  function downloadMarkdown() {
    const blob = new Blob([generateMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title}_制作包.md`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="策划案" value={plan ? 1 : 0} color="blue" />
        <StatCard label="角色" value={characters.length} color="green" />
        <StatCard label="场景" value={scenes.length} color="purple" />
        <StatCard label="分镜" value={shots.length} color="amber" />
      </div>

      {/* Production overview */}
      {shots.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">生产总览</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            <MiniStat label="分镜" value={shots.length} />
            <MiniStat label="待生成" value={pending} color="text-gray-500" />
            <MiniStat label="已生成图" value={imageDone} color="text-blue-600" />
            <MiniStat label="已生成视频" value={videoDone} color="text-purple-600" />
            <MiniStat label="需重做" value={redo} color="text-red-600" />
            <MiniStat label="已通过" value={approved} color="text-green-600" />
            <MiniStat label="完成度" value={`${completionPct}%`} color="text-blue-600" />
            <MiniStat label="预计积分" value={totalCredits} color="text-amber-600" />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={downloadMarkdown}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          导出制作包 Markdown
        </button>
        <button onClick={copyAll}
          className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">
          复制全部内容
        </button>
      </div>

      {copied && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{copied}</div>
      )}

      {/* Preview */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">制作包预览</h3>
          <span className="text-xs text-gray-400">{shots.length} 个镜头</span>
        </div>
        <div className="p-5">
          <pre className="bg-gray-50 rounded-lg p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto text-gray-700 font-mono">
            {generateMarkdown()}
          </pre>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className={`${colors[color] || colors.blue} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color || "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
