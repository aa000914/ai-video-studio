"use client";

import { useState, useEffect } from "react";

export default function ExportPanel({ project, projectId }) {
  const [plan, setPlan] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [shots, setShots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [copied, setCopied] = useState("");

  useEffect(() => { loadData(); }, [projectId]);

  async function loadData() {
    try {
      const [planRes, charRes, sceneRes, shotRes, tasksRes, assetsRes] = await Promise.all([
        fetch(`/api/plans?project_id=${projectId}`),
        fetch(`/api/characters?project_id=${projectId}`),
        fetch(`/api/scenes?project_id=${projectId}`),
        fetch(`/api/shots?project_id=${projectId}`),
        fetch(`/api/tasks?project_id=${projectId}&limit=500`),
        fetch(`/api/generated-assets?project_id=${projectId}`),
      ]);
      const [p, c, s, sh, t, a] = await Promise.all([
        planRes.json(), charRes.json(), sceneRes.json(), shotRes.json(), tasksRes.json(), assetsRes.json(),
      ]);
      setPlan(p.data || null);
      setCharacters(c.data || []);
      setScenes(s.data || []);
      const sortedShots = (sh.data || []).sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0));
      setShots(sortedShots);
      setTasks(t.data || []);
      setAssets(a.data || []);
    } catch { /* ignore */ }
  }

  // Build task lookup by shot_id
  const tasksByShot = {};
  tasks.forEach((t) => {
    if (t.shot_id) {
      if (!tasksByShot[t.shot_id]) tasksByShot[t.shot_id] = [];
      tasksByShot[t.shot_id].push(t);
    }
  });

  // Stats helpers (use generated_assets for accurate counts)
  const imageAssets = assets.filter((a) => (a.type || "").includes("image"));
  const videoAssets = assets.filter((a) => (a.type || "").includes("video") || a.type === "video");
  const selectedImages = shots.filter((s) => s.selected_image_asset_id || s.selected_image_url).length;
  const finalVideos = shots.filter((s) => s.final_video_asset_id || s.selected_video_url).length;
  const approved = shots.filter((s) => s.status === "已通过").length;
  const pending = shots.filter((s) => !s.status || s.status === "待生成").length;
  const imageDone = imageAssets.length;
  const videoDone = videoAssets.length;
  const redo = shots.filter((s) => s.status === "需重做").length;
  const completionPct = shots.length > 0 ? Math.round((approved / shots.length) * 100) : 0;

  const succeededTasks = tasks.filter((t) => t.status === "succeeded").length;
  const failedTasks = tasks.filter((t) => t.status === "failed").length;
  const runningTasks = tasks.filter((t) => t.status === "running" || t.status === "pending").length;

  function generateMarkdown() {
    const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
    let md = `# ${project.title}\n\n`;
    md += `> 本制作包由 AI视频生产工作台 V6 生成任务中心版 自动生成\n`;
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
    md += `| 生成任务总数 | ${tasks.length} |\n`;
    md += `| 成功 | ${succeededTasks} |\n`;
    md += `| 失败 | ${failedTasks} |\n`;
    md += `| 进行中 | ${runningTasks} |\n`;
    md += `\n---\n\n`;

    // ===== 模型配置建议 =====
    md += `## 模型配置建议\n\n`;
    md += `| 配置项 | 推荐值 |\n|------|------|\n`;
    md += `| 推荐生图模型 | wan2.7-image-pro / qwen-image-2.0-pro |\n`;
    md += `| 推荐视频模型 | happyhorse-1.0-video（万能） / wan2.7 回退 |\n`;
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

    // ===== 五、分镜执行清单（含任务状态） =====
    md += `## 五、分镜执行清单（含生成任务状态）\n\n`;
    if (shots.length === 0) {
      md += `> 暂无分镜\n\n`;
    } else {
      md += `> 以下为每个镜头的执行详情，包含状态、提示词、生成任务记录和制作备注。\n\n`;
      shots.forEach((s) => {
        const shotTasks = tasksByShot[s.id] || [];
        const imageTask = shotTasks.find((t) => t.type === "image");
        const videoTask = shotTasks.find((t) => t.type === "i2v" || t.type === "t2v");

        md += `### 镜头 ${s.shot_number} — ${s.scene_name || "—"}\n\n`;
        md += `| 属性 | 内容 |\n|------|------|\n`;
        md += `| 状态 | ${s.status || "待生成"} |\n`;
        md += `| 场景 | ${s.scene_name || "—"} |\n`;
        md += `| 角色 | ${s.characters || "—"} |\n`;
        md += `| 时长 | ${s.duration || "—"} |\n`;
        if (s.visual) md += `| 画面 | ${s.visual} |\n`;
        if (s.dialogue) md += `| 台词 | ${s.dialogue} |\n`;

        // Generation task status
        if (imageTask) {
          md += `| 生图模型 | ${imageTask.model || "—"} |\n`;
          md += `| 生图状态 | ${imageTask.status || "—"} |\n`;
          if (imageTask.status === "failed") md += `| 生图失败原因 | ${imageTask.error_message || "—"} |\n`;
        }
        if (videoTask) {
          md += `| 视频模型 | ${videoTask.model || "—"} |\n`;
          md += `| 视频状态 | ${videoTask.status || "—"} |\n`;
          if (videoTask.status === "failed") md += `| 视频失败原因 | ${videoTask.error_message || "—"} |\n`;
        }

        md += `\n**图片提示词**\n\n\`\`\`\n${s.image_prompt || "—"}\n\`\`\`\n\n`;
        if (s.refined_image_prompt) md += `**润色版图片提示词**\n\n\`\`\`\n${s.refined_image_prompt}\n\`\`\`\n\n`;
        md += `**视频提示词**\n\n\`\`\`\n${s.video_prompt || "—"}\n\`\`\`\n\n`;
        if (s.refined_video_prompt) md += `**润色版视频提示词**\n\n\`\`\`\n${s.refined_video_prompt}\n\`\`\`\n\n`;

        // Generated assets
        if (s.image_url) {
          md += `**已生成图片**\n\n![镜头${s.shot_number}](${s.image_url})\n\n[打开原图](${s.image_url})\n\n`;
        }
        if (s.video_url) {
          md += `**已生成视频**\n\n[视频预览](${s.video_url}) | [下载视频](${s.video_url})\n\n`;
        }

        if (s.notes) md += `**制作备注**：${s.notes}\n\n`;
        md += `---\n\n`;
      });
    }

    // ===== 六、生成任务汇总 =====
    md += `## 六、生成任务汇总\n\n`;
    if (tasks.length === 0) {
      md += `> 暂无生成任务\n\n`;
    } else {
      md += `| 类型 | 模型 | 状态 | 创建时间 | 结果 | 错误信息 |\n`;
      md += `|------|------|------|----------|------|----------|\n`;
      tasks.slice(0, 100).forEach((t) => {
        const typeLabels = { image: "生图", t2v: "文生视频", i2v: "图生视频", video_edit: "视频编辑" };
        const time = t.created_at ? new Date(t.created_at).toLocaleString("zh-CN") : "—";
        md += `| ${typeLabels[t.type] || t.type} | ${t.model || "—"} | ${t.status || "—"} | ${time} | ${t.result_url ? "[查看结果](" + t.result_url + ")" : "—"} | ${t.error_message || "—"} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    // ===== 七、制作注意事项 =====
    md += `## 七、制作注意事项\n\n`;
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
    md += `\n### 5. 推荐生成顺序\n\n`;
    md += `1. 先生图，确认构图和光影\n2. 再生视频\n3. 后期合成\n`;

    // Failed tasks reminder
    if (failedTasks > 0) {
      md += `\n### ⚠️ 需要处理的任务\n\n`;
      md += `- 共有 ${failedTasks} 个生成任务失败，请检查上表"失败原因"列并重新生成。\n`;
    }

    md += `\n---\n\n> 本文件由 AI视频生产工作台 V6 生成任务中心版 自动生成\n`;
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

  function generateCSV() {
    const rows = [["shot_index","image_prompt","video_prompt","audio_prompt","negative_prompt","selected_image_url","final_video_url"]];
    shots.forEach((s) => rows.push([
      s.shot_number || "", s.image_prompt || "", s.video_prompt || "", s.audio_prompt || "",
      s.negative_prompt || "", s.selected_image_url || s.image_url || "", s.selected_video_url || s.video_url || "",
    ]));
    return "﻿" + rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  }
  function downloadCSV() {
    const blob = new Blob([generateCSV()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title}_分镜Prompt.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function generateJSON() {
    return JSON.stringify({ project: { title: project?.title, type: project?.type }, plan, characters, scenes, shots, tasks, exportedAt: new Date().toISOString() }, null, 2);
  }
  function downloadJSON() {
    const blob = new Blob([generateJSON()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${project.title}_项目数据.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="策划案" value={plan ? 1 : 0} color="blue" />
        <StatCard label="角色" value={characters.length} color="green" />
        <StatCard label="场景" value={scenes.length} color="purple" />
        <StatCard label="分镜" value={shots.length} color="amber" />
        <StatCard label="生成任务" value={`${tasks.length}`} color="indigo" />
      </div>

      {/* Production overview */}
      {shots.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">生产总览</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniStat label="分镜" value={shots.length} />
            <MiniStat label="已生成图" value={imageDone} color="text-blue-600" />
            <MiniStat label="已生成视频" value={videoDone} color="text-purple-600" />
            <MiniStat label="Selected 图" value={selectedImages} color="text-blue-600" />
            <MiniStat label="Final 视频" value={finalVideos} color="text-purple-600" />
            <MiniStat label="待生成" value={pending} color="text-gray-500" />
            <MiniStat label="需重做" value={redo} color="text-red-600" />
            <MiniStat label="已通过" value={approved} color="text-green-600" />
            <MiniStat label="任务成功" value={`${succeededTasks}/${tasks.length}`} color="text-green-600" />
            <MiniStat label="完成度" value={`${completionPct}%`} color="text-blue-600" />
          </div>
          {failedTasks > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">⚠️ {failedTasks} 个生成任务失败，请检查并重新生成</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={downloadMarkdown}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
          导出制作包 (Markdown)
        </button>
        <button onClick={downloadCSV}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm">
          导出提示词表 (CSV)
        </button>
        <button onClick={downloadJSON}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm">
          导出项目数据 (JSON)
        </button>
        <button onClick={copyAll}
          className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">
          复制制作包
        </button>
      </div>

      {copied && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{copied}</div>
      )}

      {/* Preview */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 text-sm">制作包预览</h3>
          <span className="text-xs text-gray-400">{shots.length} 个镜头 · {tasks.length} 个任务</span>
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
    indigo: "bg-indigo-50 text-indigo-600",
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
