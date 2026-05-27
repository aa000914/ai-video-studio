"use client";

import { useState, useEffect } from "react";

export default function ExportPanel({ project, projectId }) {
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [charRes, sceneRes, shotRes] = await Promise.all([
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
      ]);
      const [c, s, sh] = await Promise.all([
        charRes.json(),
        sceneRes.json(),
        shotRes.json(),
      ]);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      setShots(sh.data || []);
    } catch {
      // silently fail
    }
  }

  function generateMarkdown() {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    const pendingShots = shots.filter((s) => s.status !== "已生成").length;
    const doneShots = shots.length - pendingShots;

    let md = "";

    // ===== 封面信息 =====
    md += `# ${project.title}\n\n`;
    md += `> 本制作包由 AI视频生产工作台 自动生成\n`;
    md += `> 导出时间：${now}\n\n`;
    md += `---\n\n`;

    // ===== 1. 项目信息 =====
    md += `## 一、项目信息\n\n`;
    md += `| 字段 | 内容 |\n`;
    md += `|------|------|\n`;
    md += `| 项目名称 | ${project.title || "—"} |\n`;
    md += `| 类型 | ${project.type || "—"} |\n`;
    md += `| 目标平台 | ${project.platform || "—"} |\n`;
    md += `| 当前状态 | ${project.status || "—"} |\n`;
    md += `| 创建时间 | ${project.created_at ? new Date(project.created_at).toLocaleDateString("zh-CN") : "—"} |\n`;
    if (project.description) {
      md += `| 项目简介 | ${project.description} |\n`;
    }
    md += `\n`;
    md += `### 制作概览\n\n`;
    md += `| 资产类型 | 数量 |\n`;
    md += `|----------|------|\n`;
    md += `| 角色 | ${characters.length} |\n`;
    md += `| 场景 | ${scenes.length} |\n`;
    md += `| 分镜 | ${shots.length}（已完成 ${doneShots} / 待生成 ${pendingShots}） |\n`;
    md += `\n---\n\n`;

    // ===== 2. 角色资产清单 =====
    md += `## 二、角色资产清单\n\n`;
    if (characters.length === 0) {
      md += `> 暂无角色数据\n\n`;
    } else {
      characters.forEach((c, i) => {
        md += `### 角色 ${i + 1}：${c.name}\n\n`;
        md += `| 属性 | 内容 |\n`;
        md += `|------|------|\n`;
        md += `| 角色定位 | ${c.role || "—"} |\n`;
        md += `| 年龄 | ${c.age || "—"} |\n`;
        md += `| 性格 | ${c.personality || "—"} |\n`;
        if (c.appearance) md += `| 外貌描述 | ${c.appearance} |\n`;
        if (c.costume) md += `| 服装设定 | ${c.costume} |\n`;
        if (c.prompt) md += `| AI 生图提示词 | \`${c.prompt}\` |\n`;
        if (c.notes) md += `| 备注 | ${c.notes} |\n`;
        md += `\n`;
      });
    }
    md += `---\n\n`;

    // ===== 3. 场景资产清单 =====
    md += `## 三、场景资产清单\n\n`;
    if (scenes.length === 0) {
      md += `> 暂无场景数据\n\n`;
    } else {
      scenes.forEach((s, i) => {
        md += `### 场景 ${i + 1}：${s.name}\n\n`;
        md += `| 属性 | 内容 |\n`;
        md += `|------|------|\n`;
        md += `| 地点 | ${s.location || "—"} |\n`;
        md += `| 时间段 | ${s.time_period || "—"} |\n`;
        if (s.description) md += `| 场景描述 | ${s.description} |\n`;
        if (s.lighting) md += `| 灯光方案 | ${s.lighting} |\n`;
        if (s.style) md += `| 风格 | ${s.style} |\n`;
        if (s.prompt) md += `| AI 生图提示词 | \`${s.prompt}\` |\n`;
        if (s.notes) md += `| 备注 | ${s.notes} |\n`;
        md += `\n`;
      });
    }
    md += `---\n\n`;

    // ===== 4. 分镜表 =====
    md += `## 四、分镜表\n\n`;
    if (shots.length === 0) {
      md += `> 暂无分镜数据\n\n`;
    } else {
      md += `| # | 场景 | 时长 | 角色 | 画面描述 | 镜头运动 | 对白/旁白 | 音效 | 状态 |\n`;
      md += `|---|------|------|------|----------|----------|-----------|------|------|\n`;
      shots.forEach((s) => {
        const visual = (s.visual || "—").replace(/\|/g, "｜");
        const camera = (s.camera || "—").replace(/\|/g, "｜");
        const dialogue = (s.dialogue || "—").replace(/\|/g, "｜").replace(/\n/g, " / ");
        const sound = (s.sound || "—").replace(/\|/g, "｜");
        md += `| ${s.shot_number || "—"} | ${s.scene_name || "—"} | ${s.duration || "—"} | ${s.characters || "—"} | ${visual} | ${camera} | ${dialogue} | ${sound} | ${s.status || "—"} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // ===== 5. 图片提示词汇总 =====
    md += `## 五、镜头图片提示词汇总\n\n`;
    md += `> 以下提示词可直接用于 AI 图片生成工具（Midjourney / Stable Diffusion / DALL·E 等）。\n\n`;
    if (shots.filter((s) => s.image_prompt).length === 0) {
      md += `> 暂无图片提示词\n\n`;
    } else {
      shots.forEach((s) => {
        if (s.image_prompt) {
          md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
          md += `\`\`\`\n${s.image_prompt}\n\`\`\`\n\n`;
        }
      });
    }
    md += `---\n\n`;

    // ===== 6. 视频提示词汇总 =====
    md += `## 六、镜头视频提示词汇总\n\n`;
    md += `> 以下提示词可直接用于 AI 视频生成工具（Runway / Pika / Sora / Kling 等）。\n\n`;
    if (shots.filter((s) => s.video_prompt).length === 0) {
      md += `> 暂无视频提示词\n\n`;
    } else {
      shots.forEach((s) => {
        if (s.video_prompt) {
          md += `### 镜头 ${s.shot_number} — ${s.scene_name || ""}\n\n`;
          md += `\`\`\`\n${s.video_prompt}\n\`\`\`\n\n`;
        }
      });
    }
    md += `---\n\n`;

    // ===== 7. 制作注意事项 =====
    md += `## 七、制作注意事项\n\n`;

    // 角色一致性
    md += `### 1. 角色一致性\n\n`;
    if (characters.length > 0) {
      md += `- 每个角色的外貌、服装、提示词已在上方"角色资产清单"中统一设定，请所有视频生成师严格遵循。\n`;
      md += `- 同一角色在不同镜头中的服装和发型必须保持一致，避免出现"换装"问题。\n`;
      const mainChars = characters.filter((c) => c.role === "主角" || c.role === "重要配角");
      if (mainChars.length > 0) {
        md += `- 重点角色：${mainChars.map((c) => c.name).join("、")}，建议生成前先做角色定妆确认。\n`;
      }
    } else {
      md += `- 请先在"角色资产"面板中完善角色设定，再进行批量生成。\n`;
    }
    md += `\n`;

    // 场景复用
    md += `### 2. 场景复用\n\n`;
    if (scenes.length > 0) {
      md += `- 本片共涉及 ${scenes.length} 个场景：${scenes.map((s) => s.name).join("、")}。\n`;
      const sceneShotCount = {};
      shots.forEach((s) => {
        if (s.scene_name) sceneShotCount[s.scene_name] = (sceneShotCount[s.scene_name] || 0) + 1;
      });
      Object.entries(sceneShotCount).forEach(([name, count]) => {
        md += `  - "${name}"：${count} 个镜头，建议统一布景后集中拍摄/生成。\n`;
      });
    } else {
      md += `- 请先在"场景资产"面板中完善场景设定。\n`;
    }
    md += `\n`;

    // 生成顺序
    md += `### 3. 推荐生成顺序\n\n`;
    md += `1. **先生图**：按镜头编号顺序，用"图片提示词"逐镜生成静态画面，确认构图和光影。\n`;
    md += `2. **再生视频**：以确认后的静态画面为参考，用"视频提示词"生成动态镜头。\n`;
    md += `3. **后期合成**：将各镜头按分镜表顺序拼接，添加转场、音效和配乐，完成成片。\n`;
    md += `\n`;

    // 待处理提醒
    if (pendingShots > 0) {
      md += `### 4. 待处理镜头\n\n`;
      md += `当前还有 **${pendingShots}** 个镜头状态为"待生成"，请按以下清单逐个推进：\n\n`;
      md += `| # | 场景 | 角色 |\n`;
      md += `|---|------|------|\n`;
      shots
        .filter((s) => s.status !== "已生成")
        .forEach((s) => {
          md += `| ${s.shot_number || "—"} | ${s.scene_name || "—"} | ${s.characters || "—"} |\n`;
        });
      md += `\n`;
    }

    // 质量检查
    md += `### ${pendingShots > 0 ? "5" : "4"}. 质量检查清单\n\n`;
    md += `- [ ] 角色形象在全部 ${shots.length} 个镜头中保持一致\n`;
    md += `- [ ] 场景光线方向和色调统一（参考场景灯光方案）\n`;
    md += `- [ ] 所有镜头分辨率一致（建议 1080p 或 4K）\n`;
    md += `- [ ] 对白与嘴型同步（如使用 AI 配音）\n`;
    md += `- [ ] 转场流畅，无明显跳帧\n`;
    md += `\n`;

    md += `---\n\n`;
    md += `> 本文件由 AI视频生产工作台 自动生成 | V1 内部演示版\n`;

    return md;
  }

  function generateCSV() {
    let csv =
      "镜头编号,场景,时长,角色,画面描述,镜头运动,对白,音效,图片提示词,视频提示词,状态\n";
    shots.forEach((s) => {
      const row = [
        s.shot_number,
        s.scene_name,
        s.duration,
        s.characters,
        s.visual,
        s.camera,
        s.dialogue,
        s.sound,
        s.image_prompt,
        s.video_prompt,
        s.status,
      ].map((v) => `"${(v || "").replace(/"/g, '""')}"`);
      csv += row.join(",") + "\n";
    });
    return csv;
  }

  async function copyAll() {
    const md = generateMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied("已复制制作包内容到剪贴板");
    } catch {
      setCopied("复制失败，请手动复制");
    }
    setTimeout(() => setCopied(""), 2000);
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}_制作包.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const csv = generateCSV();
    const BOM = "﻿";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}_分镜表.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{characters.length}</div>
          <div className="text-xs text-blue-500 mt-1">角色</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{scenes.length}</div>
          <div className="text-xs text-green-500 mt-1">场景</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{shots.length}</div>
          <div className="text-xs text-purple-500 mt-1">分镜</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {shots.filter((s) => s.status === "已生成").length}
          </div>
          <div className="text-xs text-amber-500 mt-1">已生成</div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadMarkdown}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          导出制作包 Markdown
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm"
        >
          导出 CSV
        </button>
        <button
          onClick={copyAll}
          className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50"
        >
          复制全部内容
        </button>
      </div>

      {copied && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {copied}
        </div>
      )}

      {/* Export preview */}
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
