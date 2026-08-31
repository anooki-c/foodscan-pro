import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "食品配料分析",
  description: "帮你看懂食品里到底有什么。成分类型、添加剂用途、潜在过敏原，不评判好坏。",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "食品配料分析",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7C5BC9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        {/* Service Worker 注册（仅生产构建，避免开发时缓存干扰） */}
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').catch(function () {});
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
