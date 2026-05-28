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

  function generateMarkdown() {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    let md = `# ${project.title}\n\n`;
    md += `> 本制作包由 AI视频生产工作台 自动生成\n`;
    md += `> 导出时间：${now}\n\n`;
    md += `---\n\n`;

    // 一、策划案
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
      md += `| 剧集数 | ${plan.episode_count || "1"} |\n`;
      if (plan.script_text) {
        md += `\n### 剧本原文\n\n${plan.script_text}\n`;
      }
    } else {
      md += `> 暂无策划案\n`;
    }
    md += `\n---\n\n`;

    // 二、角色主体
    md += `## 二、角色主体\n\n`;
    if (characters.length === 0) {
      md += `> 暂无角色数据\n\n`;
    } else {
      characters.forEach((c, i) => {
        md += `### 角色 ${i + 1}：${c.name}\n\n`;
        md += `**基础设定**\n\n`;
        md += `| 属性 | 内容 |\n|------|------|\n`;
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

    // 三、场景主体
    md += `## 三、场景主体\n\n`;
    if (scenes.length === 0) {
      md += `> 暂无场景数据\n\n`;
    } else {
      scenes.forEach((s, i) => {
        md += `### 场景 ${i + 1}：${s.name}\n\n`;
        md += `**空间描述**\n\n`;
        md += `| 属性 | 内容 |\n|------|------|\n`;
        md += `| 地点 | ${s.location || "—"} |\n`;
        md += `| 时代 | ${s.time_period || "—"} |\n`;
        if (s.description) md += `| 空间 | ${s.description} |\n`;
        if (s.lighting) md += `| 光线 | ${s.lighting} |\n`;
        if (s.style) md += `| 风格 | ${s.style} |\n`;
        md += `\n**场景提示词**\n\n\`\`\`\n${s.prompt || "—"}\n\`\`\`\n\n`;
        md += `**禁止元素**\n\n${s.prohibited_elements || "—"}\n\n`;
        if (s.prompt_front) md += `**主视图提示词**：\`${s.prompt_front}\`\n\n`;
        if (s.prompt_back) md += `**反打视图提示词**：\`${s.prompt_back}\`\n\n`;
        if (s.prompt_overhead) md += `**俯视图提示词**：\`${s.prompt_overhead}\`\n\n`;
      });
    }
    md += `---\n\n`;

    // 四、分镜剧本
    md += `## 四、分镜剧本\n\n`;
    if (shots.length === 0) {
      md += `> 暂无分镜数据\n\n`;
    } else {
      md += `| # | 时长 | 场景 | 角色 | 画面描述 | 运镜 | 台词/旁白 | 音效 | 状态 |\n`;
      md += `|---|------|------|------|----------|------|-----------|------|------|\n`;
      shots.forEach((s) => {
        const esc = (v) => (v || "—").replace(/\|/g, "｜").replace(/\n/g, " / ");
        md += `| ${s.shot_number || "—"} | ${s.duration || "—"} | ${esc(s.scene_name)} | ${esc(s.characters)} | ${esc(s.visual)} | ${esc(s.camera)} | ${esc(s.dialogue)} | ${esc(s.sound)} | ${s.status || "—"} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // 五、图片提示词
    md += `## 五、图片提示词\n\n`;
    md += `> 以下提示词可直接用于 AI 图片生成工具（Midjourney / Stable Diffusion / DALL·E 等）。\n\n`;
    const imageShots = shots.filter((s) => s.image_prompt);
    if (imageShots.length === 0) {
      md += `> 暂无图片提示词\n\n`;
    } else {
      imageShots.forEach((s) => {
        md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
        md += `\`\`\`\n${s.image_prompt}\n\`\`\`\n\n`;
        if (s.refined_image_prompt) {
          md += `**润色版：**\n\n\`\`\`\n${s.refined_image_prompt}\n\`\`\`\n\n`;
        }
      });
    }
    md += `---\n\n`;

    // 六、视频提示词
    md += `## 六、视频提示词\n\n`;
    md += `> 以下提示词可直接用于 AI 视频生成工具（Runway / Pika / Sora / Kling 等）。\n\n`;
    const videoShots = shots.filter((s) => s.video_prompt);
    if (videoShots.length === 0) {
      md += `> 暂无视频提示词\n\n`;
    } else {
      videoShots.forEach((s) => {
        md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
        md += `\`\`\`\n${s.video_prompt}\n\`\`\`\n\n`;
        if (s.refined_video_prompt) {
          md += `**润色版：**\n\n\`\`\`\n${s.refined_video_prompt}\n\`\`\`\n\n`;
        }
      });
    }
    md += `---\n\n`;

    // 七、制作注意事项
    md += `## 七、制作注意事项\n\n`;
    md += `### 1. 角色一致性\n\n`;
    if (characters.length > 0) {
      md += `- 每个角色的外貌、服装、提示词已在"角色主体"中统一设定，请严格遵循。\n`;
      md += `- 同一角色在不同镜头中的服装和发型必须保持一致。\n`;
    } else {
      md += `- 请先完善角色设定再进行批量生成。\n`;
    }
    md += `\n### 2. 场景一致性\n\n`;
    if (scenes.length > 0) {
      md += `- 本片共涉及 ${scenes.length} 个场景：${scenes.map((s) => s.name).join("、")}。\n`;
      const sceneMap = {};
      shots.forEach((s) => { if (s.scene_name) sceneMap[s.scene_name] = (sceneMap[s.scene_name] || 0) + 1; });
      Object.entries(sceneMap).forEach(([name, count]) => {
        md += `  - "${name}"：${count} 个镜头，建议统一布景后集中生成。\n`;
      });
    }
    md += `\n### 3. 分镜时长\n\n`;
    md += `- 共 ${shots.length} 个分镜，建议总时长控制在 ${Math.round(shots.length * 5 / 60)} 分钟以内。\n`;
    if (plan?.aspect_ratio) {
      md += `\n### 4. 画面比例\n\n- 本片画面比例为 **${plan.aspect_ratio}**，所有镜头需统一输出。\n`;
    }
    md += `\n### 5. 配音建议\n\n`;
    md += `- 对白类镜头建议使用 TTS 配音（如 ElevenLabs / 剪映配音）。\n`;
    md += `- 旁白类镜头建议保持统一语调。\n`;
    md += `- 背景音乐建议使用无版权素材（如 Epidemic Sound / Artlist）。\n`;
    md += `\n### 6. 推荐生成顺序\n\n`;
    md += `1. 先生图，确认构图和光影\n`;
    md += `2. 再生视频，以确认后的静态画面为参考\n`;
    md += `3. 后期合成，添加转场、音效和配乐\n`;

    const pendingShots = shots.filter((s) => s.status !== "已通过" && s.status !== "已生成视频").length;
    if (pendingShots > 0) {
      md += `\n### 7. 待处理镜头\n\n当前还有 **${pendingShots}** 个镜头待处理。\n`;
    }

    md += `\n---\n\n> 本文件由 AI视频生产工作台 自动生成 | Seko风格 V1\n`;
    return md;
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopied("已复制");
    } catch { setCopied("复制失败"); }
    setTimeout(() => setCopied(""), 2000);
  }

  function downloadMarkdown() {
    const blob = new Blob([generateMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}_制作包.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{plan ? 1 : 0}</div>
          <div className="text-xs text-blue-500 mt-1">策划案</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{characters.length}</div>
          <div className="text-xs text-green-500 mt-1">角色</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{scenes.length}</div>
          <div className="text-xs text-purple-500 mt-1">场景</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{shots.length}</div>
          <div className="text-xs text-amber-500 mt-1">分镜</div>
        </div>
      </div>

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
