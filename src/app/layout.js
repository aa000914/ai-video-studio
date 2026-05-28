import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "AI视频生产工作台",
  description: "AI视频生产工作台 - 从剧本到分镜提示词，一站式管理 AI 视频生产流程。老板演示版。",
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
