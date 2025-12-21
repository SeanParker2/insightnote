import Link from 'next/link';
import { Playfair_Display } from '@/lib/fonts';

const playfair = Playfair_Display({ subsets: ['latin'] });

export const metadata = {
  title: '服务条款｜InsightNote',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-14">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className={`${playfair.className} text-4xl font-bold text-slate-900`}>服务条款</h1>
        <p className="mt-4 text-sm text-slate-600">
          这些条款用于说明你在使用 InsightNote 服务时的权利与义务。
        </p>

        <div className="mt-10 space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-slate-900">使用许可</h2>
            <p className="mt-2">
              InsightNote 提供研究内容与工具用于个人学习与投资研究参考。未经许可不得转载、镜像或大规模抓取。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">内容声明</h2>
            <p className="mt-2">
              本站内容不构成投资建议。你应自行评估风险并对投资决策负责。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">联系我们</h2>
            <p className="mt-2">
              对条款有疑问请通过{' '}
              <Link href="/feedback" className="text-brand-900 font-bold hover:underline">
                反馈页面
              </Link>{' '}
              联系我们。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
