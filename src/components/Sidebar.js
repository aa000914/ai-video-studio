"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Library, FolderKanban, Play, Settings, Bell } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [toast, setToast] = useState("");

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    if (path === "/projects") return pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects");
    return pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "首页" },
    { path: "/projects", icon: FolderKanban, label: "项目" },
    { path: "/assets", icon: Library, label: "资产库" },
    { path: "/tasks", icon: ListChecks, label: "任务" },
  ];

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <aside
      className="h-screen flex flex-col shrink-0 fixed left-0 top-0"
      style={{
        width: "280px",
        background: "linear-gradient(180deg, #050B18 0%, #0B1020 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
          >
            <Play size={16} className="text-white ml-0.5" fill="white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base tracking-tight truncate">AI 视频工作台</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">创作从未如此简单</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 transition-all"
              style={{
                height: "58px",
                padding: "0 20px",
                borderRadius: "18px",
                fontSize: "14px",
                fontWeight: active ? 600 : 400,
                background: active ? "rgba(99,102,241,0.18)" : "transparent",
                border: active ? "1px solid rgba(139,92,246,0.7)" : "1px solid transparent",
                color: active ? "#ffffff" : "#AAB4C8",
              }}
            >
              <Icon size={18} className={active ? "text-white" : "text-[#AAB4C8]"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Pro Card */}
      <div className="px-4 pb-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <p className="text-white text-sm font-semibold">专业版</p>
          <p className="text-gray-500 text-[11px] mt-1 leading-relaxed">解锁高级功能与无限导出</p>
          <button
            onClick={() => showToast("专业版功能正在准备中")}
            className="mt-2.5 text-[11px] font-medium rounded-lg px-3 py-1.5 transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(90deg, #6366f1, #a855f7)",
              color: "white",
            }}
          >
            升级套餐
          </button>
        </div>
      </div>

      {/* User area */}
      <div className="px-4 pb-5 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
          >
            小
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">创作者_小林</p>
            <p className="text-gray-600 text-[10px]">个人账户</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => showToast("通知功能正在准备中")} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
              <Bell size={14} />
            </button>
            <button onClick={() => showToast("设置功能正在准备中")} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white text-xs px-5 py-2.5 rounded-xl shadow-2xl border border-white/10 backdrop-blur animate-pulse whitespace-nowrap">
          {toast}
        </div>
      )}
    </aside>
  );
}
