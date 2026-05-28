"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">AI视频工作台</h1>
        <p className="text-gray-500 text-xs mt-1">Seko 风格 V1</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive("/")
              ? "bg-gray-800 text-white"
              : "hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="text-base">🏠</span>
          首页
        </Link>

        <Link
          href="/subjects"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive("/subjects")
              ? "bg-gray-800 text-white"
              : "hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="text-base">📚</span>
          主体库
        </Link>

        <Link
          href="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive("/workspace")
              ? "bg-gray-800 text-white"
              : "hover:bg-gray-800 hover:text-white text-gray-500"
          }`}
        >
          <span className="text-base">💼</span>
          我的空间
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        AI Video Studio V1
      </div>
    </aside>
  );
}
