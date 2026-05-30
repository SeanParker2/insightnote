import Link from 'next/link';

export function Footer() {
  return (
    <footer className="h-8 flex items-center justify-between px-6 text-[10px] text-neutral-400 border-t border-neutral-100">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>系统就绪</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/privacy" className="hover:text-neutral-600 transition-colors">隐私政策</Link>
        <Link href="/terms" className="hover:text-neutral-600 transition-colors">服务条款</Link>
        <Link href="/feedback" className="hover:text-neutral-600 transition-colors">意见反馈</Link>
      </div>
      <span>&copy; {new Date().getFullYear()} InsightNote</span>
    </footer>
  );
}
