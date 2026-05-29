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

  const linkClass = (path) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all border-l-[3px] ${
      isActive(path)
        ? "border-indigo-500 bg-white/[0.04] text-white"
        : "border-transparent hover:bg-white/[0.03] text-gray-400 hover:text-gray-200"
    }`;

  return (
    <aside className="w-60 bg-[#070b16] text-gray-400 flex flex-col shrink-0 border-r border-white/[0.05]">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.05]">
        <h1 className="text-white font-bold text-lg tracking-tight">
          AI 视频工作台
        </h1>
        <p className="text-gray-500 text-xs mt-1">Seko 风格 V1</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href="/" className={linkClass("/")}>
          <LayoutDashboard size={18} />
          首页
        </Link>

        <Link href="/subjects" className={linkClass("/subjects")}>
          <Library size={18} />
          主体库
        </Link>

        <Link href="/" className={linkClass("/workspace")}>
          <FolderOpen size={18} />
          我的空间
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.05] text-xs text-gray-600">
        AI Video Studio V1
      </div>
    </aside>
  );
}
