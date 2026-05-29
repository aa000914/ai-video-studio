"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, FolderOpen } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-56 bg-[#0b0b1a] border-r border-white/[0.06] text-gray-400 flex flex-col shrink-0">
      <div className="p-5 border-b border-white/[0.06]">
        <h1 className="text-white font-bold text-lg tracking-tight">AI 视频工作台</h1>
        <p className="text-gray-500 text-xs mt-1">Seko 风格 V2</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            isActive("/")
              ? "bg-white/[0.06] text-white"
              : "hover:bg-white/[0.04] hover:text-white/80"
          }`}
        >
          <LayoutDashboard size={18} />
          首页
        </Link>

        <Link
          href="/subjects"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            isActive("/subjects")
              ? "bg-white/[0.06] text-white"
              : "hover:bg-white/[0.04] hover:text-white/80"
          }`}
        >
          <Library size={18} />
          主体库
        </Link>

        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
            isActive("/workspace")
              ? "bg-white/[0.06] text-white"
              : "hover:bg-white/[0.04] hover:text-white/80 text-gray-600"
          }`}
        >
          <FolderOpen size={18} />
          我的空间
        </Link>
      </nav>

      <div className="p-4 border-t border-white/[0.06] text-xs text-gray-600">
        AI Video Studio V2
      </div>
    </aside>
  );
}
