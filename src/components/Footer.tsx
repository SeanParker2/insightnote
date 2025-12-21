import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-brand-900 text-white py-8">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-serif text-xl font-bold">InsightNote</span>
          <p className="text-sm text-gray-400">
            专业金融洞察与分析
          </p>
        </div>
        <div className="flex gap-6 text-sm text-gray-300">
          <Link href="/pricing" className="hover:text-brand-gold transition-colors">
            订阅
          </Link>
          <Link href="/privacy" className="hover:text-brand-gold transition-colors">
            隐私
          </Link>
          <Link href="/terms" className="hover:text-brand-gold transition-colors">
            条款
          </Link>
          <Link href="/feedback" className="hover:text-brand-gold transition-colors">
            反馈
          </Link>
        </div>
        <div className="text-xs text-gray-500">
          © {new Date().getFullYear()} InsightNote。版权所有。
        </div>
      </div>
    </footer>
  );
}
