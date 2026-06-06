import type { Metadata, Viewport } from "next";
import { inter, mono } from '@/lib/fonts';
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";

export const metadata: Metadata = {
  title: "InsightNote",
  description: "投资研究平台",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <MobileTabBar />
      </body>
    </html>
  );
}
