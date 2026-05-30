"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Library, Play } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "首页" },
    { path: "/tasks", icon: ListChecks, label: "任务" },
    { path: "/assets", icon: Library, label: "资产库" },
  ];

  return (
    <aside className="h-screen flex flex-col shrink-0"
      style={{ width: "240px", background: "#080d1a", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
            <Play size={15} className="text-white ml-0.5" fill="white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base tracking-tight truncate">AI 视频工作台</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}
              className="flex items-center gap-3 transition-all"
              style={{
                padding: "0 16px", height: "56px", borderRadius: "14px",
                fontSize: "14px", fontWeight: active ? 600 : 400,
                background: active ? "rgba(99,102,241,0.18)" : "transparent",
                border: active ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent",
                color: active ? "white" : "#94a3b8",
              }}>
              <Icon size={18} />{item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
