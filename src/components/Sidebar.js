"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  FolderOpen,
  Play,
  HelpCircle,
  Bell,
  Settings,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "首页" },
    { path: "/subjects", icon: Library, label: "主体库" },
    { path: "/workspace", icon: FolderOpen, label: "我的空间" },
  ];

  return (
    <aside
      className="h-screen flex flex-col shrink-0"
      style={{
        width: "300px",
        background: "#080d1a",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* ---- Logo ---- */}
      <div className="px-6 py-7">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #6366f1, #a855f7)",
            }}
          >
            <Play
              size={16}
              className="text-white ml-0.5"
              fill="white"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg tracking-tight truncate">
              AI视频工作台
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Seko 风格 V1
            </p>
          </div>
        </div>
      </div>

      {/* ---- Navigation ---- */}
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
                padding: "0 18px",
                height: "64px",
                borderRadius: "16px",
                fontSize: "15px",
                fontWeight: active ? 600 : 400,
                background: active
                  ? "rgba(99,102,241,0.18)"
                  : "transparent",
                border: active
                  ? "1px solid rgba(139,92,246,0.6)"
                  : "1px solid transparent",
                color: active ? "white" : "#94a3b8",
              }}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ---- Bottom Area ---- */}
      <div className="px-4 pb-6 space-y-4">
        {/* Pro Card */}
        <div
          className="p-4 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))",
            border: "1px solid rgba(139,92,246,0.22)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-white text-sm font-semibold">
              专业版
            </span>
          </div>
          <p className="text-gray-400 text-xs mb-3 leading-relaxed">
            解锁高级功能与无限导出
          </p>
          <button
            className="w-full py-2 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-1 transition-all hover:opacity-90"
            style={{
              background:
                "linear-gradient(90deg, #a855f7, #6366f1)",
            }}
          >
            升级套餐
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4 px-2">
          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <HelpCircle size={18} />
          </button>
          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <Bell size={18} />
          </button>
          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <Settings size={18} />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2.5 px-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{
              background:
                "linear-gradient(135deg, #6366f1, #a855f7)",
            }}
          >
            创
          </div>
          <span className="text-gray-400 text-sm truncate">
            创作者_小林
          </span>
        </div>
      </div>
    </aside>
  );
}
