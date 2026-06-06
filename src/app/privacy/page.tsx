import Link from 'next/link';
import { playfair } from '@/lib/fonts';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata = { title: '隐私政策｜InsightNote' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="隐私政策" breadcrumbs={[{ label: '首页', href: '/' }, { label: '隐私政策' }]} />
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <h1 className={`${playfair.className} text-4xl font-bold text-text-primary mb-4`}>隐私政策</h1>
        <p className="text-sm text-text-secondary mb-10">InsightNote 收集最少必要的数据，用于提供登录、内容访问、产品分析与用户反馈。</p>
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <section><h2 className="text-base font-bold text-text-primary">我们收集什么</h2><ul className="mt-2 list-disc pl-5 space-y-1"><li>账号信息：邮箱（用于登录与账户识别）。</li><li>订阅状态：用于决定内容访问权限。</li><li>产品事件：用于改进体验（例如页面访问、按钮点击）。</li><li>用户反馈：你提交的反馈内容与可选联系方式。</li></ul></section>
          <section><h2 className="text-base font-bold text-text-primary">我们如何使用</h2><ul className="mt-2 list-disc pl-5 space-y-1"><li>提供核心功能：登录、文章阅读、工具使用。</li><li>改进产品：分析使用路径并优化转化与留存。</li><li>支持与沟通：处理你提交的反馈与问题。</li></ul></section>
          <section><h2 className="text-base font-bold text-text-primary">联系我们</h2><p className="mt-2">如需删除数据或咨询隐私问题，请通过 <Link href="/feedback" className="text-brand-light font-bold hover:underline">反馈页面</Link> 联系我们。</p></section>
        </div>
      </div>
    </div>
  );
}
