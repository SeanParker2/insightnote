import Link from 'next/link';
import { playfair } from '@/lib/fonts';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata = { title: '服务条款｜InsightNote' };

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="服务条款" breadcrumbs={[{ label: '首页', href: '/' }, { label: '服务条款' }]} />
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <h1 className={`${playfair.className} text-4xl font-bold text-text-primary mb-4`}>服务条款</h1>
        <p className="text-sm text-text-secondary mb-10">这些条款用于说明你在使用 InsightNote 服务时的权利与义务。</p>
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <section><h2 className="text-base font-bold text-text-primary">使用许可</h2><p className="mt-2">InsightNote 提供研究内容与工具用于个人学习与投资研究参考。未经许可不得转载、镜像或大规模抓取。</p></section>
          <section><h2 className="text-base font-bold text-text-primary">内容声明</h2><p className="mt-2">本站内容不构成投资建议。你应自行评估风险并对投资决策负责。</p></section>
          <section><h2 className="text-base font-bold text-text-primary">联系我们</h2><p className="mt-2">对条款有疑问请通过 <Link href="/feedback" className="text-brand-light font-bold hover:underline">反馈页面</Link> 联系我们。</p></section>
        </div>
      </div>
    </div>
  );
}
