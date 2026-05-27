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
    let md = `# ${project.title}\n\n`;
    md += `- 类型: ${project.type || "无"}\n`;
    md += `- 平台: ${project.platform || "无"}\n`;
    md += `- 状态: ${project.status || "无"}\n`;
    md += `- 描述: ${project.description || "无"}\n\n`;

    md += `## 角色资产\n\n`;
    characters.forEach((c) => {
      md += `### ${c.name}\n`;
      md += `- 角色: ${c.role || "无"} | 年龄: ${c.age || "无"}\n`;
      md += `- 性格: ${c.personality || "无"}\n`;
      md += `- 外貌: ${c.appearance || "无"}\n`;
      md += `- 服装: ${c.costume || "无"}\n`;
      if (c.prompt) md += `- 提示词: \`${c.prompt}\`\n`;
      md += `\n`;
    });

    md += `## 场景资产\n\n`;
    scenes.forEach((s) => {
      md += `### ${s.name}\n`;
      md += `- 地点: ${s.location || "无"} | 时间: ${s.time_period || "无"}\n`;
      md += `- 风格: ${s.style || "无"} | 灯光: ${s.lighting || "无"}\n`;
      md += `- 描述: ${s.description || "无"}\n`;
      if (s.prompt) md += `- 提示词: \`${s.prompt}\`\n`;
      md += `\n`;
    });

    md += `## 分镜表\n\n`;
    md += `| # | 场景 | 时长 | 角色 | 画面 | 镜头 | 对白 | 状态 |\n`;
    md += `|---|------|------|------|------|------|------|------|\n`;
    shots.forEach((s) => {
      md += `| ${s.shot_number || ""} | ${s.scene_name || ""} | ${s.duration || ""} | ${s.characters || ""} | ${(s.visual || "").slice(0, 30)} | ${s.camera || ""} | ${(s.dialogue || "").slice(0, 20)} | ${s.status || ""} |\n`;
    });

    md += `\n## 图片提示词汇总\n\n`;
    shots.forEach((s) => {
      if (s.image_prompt) {
        md += `- 镜头${s.shot_number}: \`${s.image_prompt}\`\n`;
      }
    });

    md += `\n## 视频提示词汇总\n\n`;
    shots.forEach((s) => {
      if (s.video_prompt) {
        md += `- 镜头${s.shot_number}: \`${s.video_prompt}\`\n`;
      }
    });

    return md;
  }

  function generateCSV() {
    let csv = "镜头编号,场景,时长,角色,画面描述,镜头运动,对白,音效,图片提示词,视频提示词,状态\n";
    shots.forEach((s) => {
      const row = [
        s.shot_number, s.scene_name, s.duration, s.characters,
        s.visual, s.camera, s.dialogue, s.sound,
        s.image_prompt, s.video_prompt, s.status,
      ].map((v) => `"${(v || "").replace(/"/g, '""')}"`);
      csv += row.join(",") + "\n";
    });
    return csv;
  }

  async function copyAll() {
    const md = generateMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      setCopied("已复制全部分镜内容到剪贴板");
    } catch {
      setCopied("复制失败，请手动复制");
    }
    setTimeout(() => setCopied(""), 2000);
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}_分镜表.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const csv = generateCSV();
    const BOM = "﻿";
    const blob = new Blob([BOM + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}_分镜表.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyAll}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          复制全部分镜
        </button>
        <button
          onClick={downloadMarkdown}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          导出 Markdown
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          导出 CSV
        </button>
      </div>

      {copied && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          {copied}
        </div>
      )}

      <div className="bg-white border rounded-lg p-5">
        <h3 className="font-medium text-gray-900 mb-3">导出预览</h3>
        <pre className="bg-gray-50 p-4 rounded text-xs whitespace-pre-wrap max-h-96 overflow-y-auto text-gray-700">
          {generateMarkdown()}
        </pre>
      </div>
    </div>
  );
}
