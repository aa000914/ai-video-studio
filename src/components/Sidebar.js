"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">🎬 AI视频工作台</h1>
        <p className="text-gray-500 text-xs mt-1">老板演示版 V2</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/"
          className={`block px-3 py-2 rounded text-sm ${
            pathname === "/"
              ? "bg-gray-800 text-white"
              : "hover:bg-gray-800 hover:text-white"
          }`}
        >
          项目列表
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        AI Video Studio
      </div>
    </aside>
  );
}
