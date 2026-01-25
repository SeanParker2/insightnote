import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 mt-12">
      <div className="container-width grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-4">
          <span className="font-sans text-lg font-bold text-foreground">InsightNote</span>
          <p className="text-sm text-muted-foreground max-w-sm">
            为专业投资者打造的智能内容中台。通过可视化的市场因果链与深度研报，发现被忽视的 Alpha 机会。
          </p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-sans font-semibold text-sm text-foreground">平台</h4>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">订阅方案</Link>
            <Link href="/tools/butterfly" className="hover:text-foreground transition-colors">蝴蝶图谱</Link>
            <Link href="/posts" className="hover:text-foreground transition-colors">最新情报</Link>
          </nav>
        </div>

        <div className="space-y-3">
          <h4 className="font-sans font-semibold text-sm text-foreground">关于</h4>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">服务条款</Link>
          </nav>
        </div>
      </div>

      <div className="container-width mt-12 pt-8 border-t border-border flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} InsightNote. 版权所有。
        </div>
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded-sm bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center cursor-pointer text-xs font-bold">
            in
          </div>
        </div>
      </div>
    </footer>
  );
}
