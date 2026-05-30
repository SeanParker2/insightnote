import type { Metadata } from "next";
import { inter, playfair, mono } from '@/lib/fonts';
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "InsightNote｜专业金融洞察",
  description: "深度解读财报与市场变化，提供可复用的研究框架与分析。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${playfair.variable} ${mono.variable} antialiased min-h-screen flex font-sans bg-[#fafafa] text-neutral-900`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
