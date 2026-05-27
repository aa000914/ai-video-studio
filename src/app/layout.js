import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "AI视频生产工作台",
  description: "AI视频团队生产管理工具",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
